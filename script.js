document.getElementById('translateBtn').addEventListener('click', async () => {
    const imageInput = document.getElementById('imageInput');
    const statusText = document.getElementById('statusText');
    const ocrResult = document.getElementById('ocrResult');
    const imagePreview = document.getElementById('imagePreview');

    if (!imageInput.files.length) {
        alert("Lütfen bir dosya seçin.");
        return;
    }

    const file = imageInput.files[0];
    
    statusText.innerText = "Görsel yükleniyor ve hazırlanıyor...";
    ocrResult.innerText = "";

    // HTML Canvas oluşturup resmi üzerine çizeceğiz
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async function() {
        // Orijinal resim boyutlarını aktaralım
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Görseli ekranda orijinal resim yerine Canvas olarak gösterelim
        imagePreview.style.display = 'none'; // Eski önizlemeyi gizle
        
        // Varsa eski canvas'ı temizle yenisini ekle
        const oldCanvas = document.getElementById('manhwaCanvas');
        if (oldCanvas) oldCanvas.remove();
        canvas.id = 'manhwaCanvas';
        canvas.style.maxWidth = '100%';
        canvas.style.marginTop = '10px';
        imagePreview.parentNode.insertBefore(canvas, imagePreview.nextSibling);

        statusText.innerText = "Yapay zekâ balonları ve metinleri tarıyor...";

        try {
            // Tesseract.js ile detaylı tarama yapıyoruz (Hata payını azaltmak için)
            const worker = await Tesseract.createWorker('eng');
            
            // Manhwa fontları için Tesseract ayarlarını optimize edelim
            await worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'" ',
            });

            const result = await worker.recognize(file);
            const paragraphs = result.data.paragraphs;

            if (!paragraphs || paragraphs.length === 0) {
                statusText.innerText = "Metin tespit edilemedi.";
                await worker.terminate();
                return;
            }

            statusText.innerText = "Metinler Türkçeye çevriliyor ve balona yazılıyor...";

            // Her bir paragraf/blok için işlem yapalım
            for (let p of paragraphs) {
                let originalText = p.text.replace(/\n/g, " ").trim();
                
                if (originalText.length < 2) continue; // Çok küçük lekeleri atla

                // Kelime hatalarını manhwa bağlamına göre basitçe düzeltelim (Tesseract iyileştirmesi)
                originalText = originalText
                    .replace(/Y0I/g, "YOU").replace(/Y0l/g, "YOU")
                    .replace(/OKDER/g, "ORDER").replace(/PRECENT/g, "PRESENT")
                    .replace(/\|/g, "");

                // Çeviriyi alalım
                const translatedText = await translateToTurkish(originalText);

                // Blok koordinatlarını alıyoruz (Kutucuk bilgisi)
                const bbox = p.bbox;
                const width = bbox.x0 - bbox.x0 + (bbox.x1 - bbox.x0);
                const height = bbox.y1 - bbox.y0;

                // 1. BALONUN İÇİNİ TEMİZLEME (Beyaz kutu atma)
                // Manhwa balonları genelde beyazdır, metnin arkasını hafif genişleterek beyazla boyuyoruz
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(bbox.x0 - 5, bbox.y0 - 5, width + 10, height + 10);

                // 2. TÜRKÇE METNİ RESMİN ÜZERİNE YAZMA
                ctx.fillStyle = '#000000'; // Siyah yazı
                ctx.font = `bold ${Math.max(14, Math.floor(height / 3))}px sans-serif`; // Boyutu balona göre ayarla
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Satır sığdırma (Metin uzunsa alt satıra geçirme)
                const words = translatedText.split(' ');
                let line = '';
                let currentY = bbox.y0 + (height / 2);
                let lines = [];
                let maxWidth = width > 0 ? width : 150;

                for (let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    let metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        lines.push(line);
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line);

                // Satırları dikeyde ortalayarak çizdirme
                let startY = (bbox.y0 + (height / 2)) - ((lines.length - 1) * 10);
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i].trim(), bbox.x0 + (width / 2), startY + (i * 20));
                }
            }

            statusText.innerText = "Çeviri tamamlandı! Sayfa doğrudan güncellendi.";
            await worker.terminate();

        } catch (error) {
            console.error(error);
            statusText.innerText = "Çeviri sırasında bir teknik hata oluştu.";
        }
    };

    // Görseli oku
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
});

// Çeviri Motoru
async function translateToTurkish(text) {
    try {
        const cleanText = encodeURIComponent(text.trim());
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${cleanText}&langpair=en|tr`);
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        return text;
    } catch (e) {
        return text;
    }
                                 }
            
