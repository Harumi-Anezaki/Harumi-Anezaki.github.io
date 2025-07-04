const canvas = document.getElementById('drawingCanvas');
const context = canvas.getContext('2d');

let drawing = false;

canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    context.beginPath();
    context.moveTo(getX(e), getY(e));
});

canvas.addEventListener('mousemove', (e) => {
    if (drawing) {
        context.lineTo(getX(e), getY(e));
        context.stroke();
    }
});

canvas.addEventListener('mouseup', () => {
    drawing = false;
    context.closePath();
});

canvas.addEventListener('mouseout', () => {
    drawing = false;
    context.closePath();
});

function getX(e) {
    return e.clientX - canvas.offsetLeft;
}

function getY(e) {
    return e.clientY - canvas.offsetTop;
}