document.getElementById('translateBtn').addEventListener('click', async () => {
    const imageInput = document.getElementById('imageInput');
    const statusText = document.getElementById('statusText');
    const imagePreview = document.getElementById('imagePreview');

    if (!imageInput.files.length) {
        alert("Lütfen bir dosya seçin.");
        return;
    }

    const file = imageInput.files[0];
    statusText.innerText = "Yapay zekâ görseli hafızaya alıyor...";

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        imagePreview.style.display = 'none';
        const oldCanvas = document.getElementById('manhwaCanvas');
        if (oldCanvas) oldCanvas.remove();
        canvas.id = 'manhwaCanvas';
        canvas.style.maxWidth = '100%';
        canvas.style.marginTop = '10px';
        imagePreview.parentNode.insertBefore(canvas, imagePreview.nextSibling);

        statusText.innerText = "Yazı alanları taranıyor (CORS Güvenli OCR)...";

        try {
            // CORS hatasını engellemek için langPath'i güvenli genel CDN'e çeviriyoruz veya tamamen kaldırıyoruz
            const result = await Tesseract.recognize(file, 'eng', {
                workerOptions: {
                    // Güvenli ve CORS izni olan resmi cdnjs/jsdelivr yollarını kullanıyoruz
                    langPath: 'https://cdn.jsdelivr.net/npm/@trevorblades/tessdata@1.0.0/'
                },
                logger: m => {
                    if(m.status === 'recognizing text') {
                        statusText.innerText = `Okuma Durumu: %${Math.floor(m.progress * 100)}`;
                    }
                }
            });
            
            // Satır bazlı okuma veri analizi
            const linesData = result.data.lines;

            if (!linesData || linesData.length === 0) {
                statusText.innerText = "Görselde okunabilir bir satır bulunamadı.";
                return;
            }

            statusText.innerText = "Yazılar Türkçeye dönüştürülüyor...";

            for (let lineObj of linesData) {
                let originalText = lineObj.text.replace(/\s+/g, ' ').trim();
                
                if (originalText.length < 2 || /^[._%|\\\/\s-]+$/.test(originalText)) continue;

                // Font düzeltme filtresi
                originalText = originalText
                    .replace(/Y0I/g, "YOU").replace(/Y0l/g, "YOU")
                    .replace(/OKDER/g, "ORDER").replace(/PRECENT/g, "PRESENT")
                    .replace(/GIVED/g, "GAVE")
                    .replace(/[|\\\/%_\[\]]/g, "")
                    .trim();

                if (originalText.length < 2) continue;

                // Çeviriyi çağır
                const translatedText = await translateToTurkish(originalText);

                const bbox = lineObj.bbox;
                const width = bbox.x1 - bbox.x0;
                const height = bbox.y1 - bbox.y0;

                // 1. ESKİ YAZIYI SİL (Beyaz boya at)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(bbox.x0 - 4, bbox.y0 - 2, width + 8, height + 4);

                // 2. TÜRKÇE YENİ METNİ YAZDIR
                ctx.fillStyle = '#000000';
                
                const fontSize = Math.max(14, Math.floor(height * 0.8));
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillText(translatedText, bbox.x0 + (width / 2), bbox.y0 + (height / 2));
            }

            statusText.innerText = "Çeviri tamamlandı ve sayfaya uygulandı!";

        } catch (error) {
            console.error("Detaylı OCR Hatası:", error);
            statusText.innerText = "CORS veya veri yükleme hatası. Detaylar konsolda.";
        }
    };

    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
});

// Çeviri Motoru (MyMemory API)
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
