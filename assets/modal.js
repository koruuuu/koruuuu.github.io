// get the modal
var modal = document.getElementById('myModal');
// get the image and insert it inside the modal
var img = document.getElementsByClassName('modal_image');
for (var i = 0; i < img.length; i++) {
    var modalImg = document.getElementById("img01");
    var captionText = document.getElementById("caption");
    img[i].addEventListener('click', function() {
        modal.style.display = "block";
        modalImg.src = this.src;
        captionText.innerHTML = this.alt;
    })
}
// get the < span > element that closes the modal
var span = document.getElementsByClassName("close")[0];
window.onclick = (e) => {
    if (e.target == modal) {
        modal.style.display = "none";
    }
}
