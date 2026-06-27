const button = document.querySelector("button");
const fileInput = document.querySelector("input[type='file']");

button.addEventListener("click", () => {
    if (!fileInput.files.length) {
        alert("Lütfen bir resim seç.");
        return;
    }

    alert("Çeviri sistemi yakında eklenecek!");
});
