document.querySelector("button").addEventListener("click", () => {
    const file = document.querySelector("input[type='file']").files[0];

    if (!file) {
        alert("Lütfen bir dosya seç.");
        return;
    }

    alert("Dosya seçildi: " + file.name);
});
