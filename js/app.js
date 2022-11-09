function UUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

class Element {
    constructor(querySelector) {
        this.HTMLElement = document.querySelector(querySelector);

        this.HTMLElement.addEventListener("mousedown", this.mousedown);
        this.HTMLElement.addEventListener("mouseup", this.mouseup);
        this.HTMLElement.addEventListener("mousemove", this.mousemove);
    }

    mousedown(e) {

    }

    mouseup(e) {

    }

    mousemove(e) {

    }
}

const Atom = (function() {
    const canvas = document.querySelector("#canvas");
    const layers = document.querySelector("#layers")
    const ctx = canvas.getContext("2d");
    const styles = getComputedStyle(document.body);
    const cursor = (function() {
        let isActive = false;

        const client = {
            x: 0,
            y: 0
        }

        canvas.addEventListener("touchstart", () => {
            isActive = true;
        });

        canvas.addEventListener("touchend", () => {
            isActive = false;
        });

        canvas.addEventListener("mousedown", () => {
            isActive = true;
        });

        canvas.addEventListener("mouseup", () => {
            isActive = false;
        });

        const move = (e) => {
            const dim = canvas.getBoundingClientRect();

            if (e.clientX || e.clientY) {            
                client.x = e.clientX - dim.x;
                client.y = e.clientY - dim.y;
            }

            if (e.touches) {  
                client.x = e.touches[0].clientX - dim.x;
                client.y = e.touches[0].clientY - dim.y;
            }
        };

        canvas.addEventListener("mousemove", move);
        canvas.addEventListener("touchmove", move);

        const render = () => {
            ctx.globalCompositeOperation = "difference";
            ctx.lineWidth = 1;
            ctx.strokeStyle = isActive ? "#0ff" : "#fff";

            ctx.beginPath();
            ctx.moveTo(-10 + client.x, 0 + client.y);
            ctx.lineTo(10 + client.x, 0 + client.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0 + client.x, -10 + client.y);
            ctx.lineTo(0 + client.x, 10 + client.y);
            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
        };

        return { render };
    })();

    let globals = {
        currentObject: () => {
            return document.querySelector("[name=object-type]:checked").value;
        },
        usesFill: () => {
            return document.querySelector("[name=object-fill]").checked;
        },
        usesStroke: () => {
            return document.querySelector("[name=object-stroke]").checked;
        }
    };

    class CanvasObject {
        constructor(style, ruleSets) {
            this.style = {
                lineWidth: document.querySelector("#stroke-width").value || 2,
                lineJoin: "round",
                strokeStyle: document.querySelector("#stroke-color").value || "#fff",
                fillStyle: document.querySelector("#fill-color").value || "#fff"
            }

            this.ruleSets = {
                usesStroke: globals.usesStroke(),
                usesFill: globals.usesFill(),
            }

            if (style) {
                this.style = style;
            }

            if (ruleSets) {
                this.ruleSets = ruleSets;
            }

            this.style.lineWidth = (this.ruleSets.usesStroke && this.ruleSets.usesFill) ? this.style.lineWidth * 2 : this.style.lineWidth;

            this.ruleSets.get = () => {
                ctx.lineWidth = this.style.lineWidth;
                ctx.lineJoin = this.style.lineJoin;

                if (this.ruleSets.usesStroke) {
                    ctx.strokeStyle = this.style.strokeStyle;
                }

                if (this.ruleSets.usesFill) {
                    ctx.fillStyle = this.style.fillStyle;
                }
            }
        }
    }

    class Rectangle extends CanvasObject {
        constructor(style, ruleSets) {
            super(style, ruleSets)
            this.rect = { x: 0, y: 0, w: 0, h: 0 };
        }

        setOrigin(x, y) {
            this.rect.x = x;
            this.rect.y = y;
        }

        setEnd(x, y) {
            this.rect.w = x - this.rect.x;
            this.rect.h = y - this.rect.y;
        }

        render() {
            this.ruleSets.get();

            if (this.ruleSets.usesFill) {
                ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
            }

            if (this.ruleSets.usesStroke) {
                ctx.strokeRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
            }

        }
    }

    class Square extends Rectangle {
        constructor(style, ruleSets) {
            super(style, ruleSets)
            this.rect = { x: 0, y: 0, w: 0, h: 0 };
        }

        setEnd(x, y) {
            this.rect.w = x - this.rect.x;
            this.rect.h = x - this.rect.x;
        }
    }

    class Paint extends CanvasObject {
        constructor(style, ruleSets) {
            super(style, ruleSets)
            this.points = new Array();
        }

        addPoint(x, y) {
            this.points.push({
                x: x,
                y: y
            })
        }

        render() {
            this.ruleSets.get();

            if (this.points.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, 0 + this.points[0].y);

                for (let i = 1; i < this.points.length; i++) {
                    ctx.bezierCurveTo(this.points[i - 1].x, this.points[i - 1].y, (this.points[i].x + this.points[i - 1].x) / 2, (this.points[i].y + this.points[i - 1].y) / 2, this.points[i].x, this.points[i].y)
                        // ctx.lineTo(this.points[i].x, 0 + this.points[i].y);
                }

                if (this.ruleSets.usesStroke) {
                    ctx.stroke();
                }

                if (this.ruleSets.usesFill) {
                    ctx.fill();
                }
            }
        }
    }

    class Layer {
        constructor(name) {
            this.objects = new Array();
            this.name = name;
            this.locked = false;
            this.id = UUID();
        }

        appendObject(object) {
            this.objects.push(object);
        }

        removeObjectIndex(i) {
            this.objects.splice(i, 1);
        }

        render() {
            // Renders all objects in order

            for (let i = 0; i < this.objects.length; i++) {
                this.objects[i].render();
            }
        }
    }

    class Canvas {
        constructor() {
            this.mousedown = false;
            this.layers = [];

            this.currentLayer = 0;
            this.client = {
                x: 0,
                y: 0
            };

            this.move = (e) => {
                cache.updateClient(e);

                switch (globals.currentObject()) {
                    case "Paint":
                        currentObject.addPoint(cache.client.x, cache.client.y)
                        break;
                    case "Rectangle":
                    case "Square":
                        currentObject.setEnd(cache.client.x, cache.client.y);
                        break;
                }
            };

            this.addLayer();

            // TODO: I WISH THERE WAS A BETTER WAY OF DOING THIS 😭
            // TODO: remove redundancy in switch case. Why 3 times???
            let cache = this;

            document.querySelector("#layers-btn-add").addEventListener("click", () => {
                cache.addLayer();
            });

            let currentObject;

            canvas.addEventListener("mousedown", (e) => {
                cache.updateClient(e);
                canvas.addEventListener("mousemove", this.move);

                switch (globals.currentObject()) {
                    case "Paint":
                        currentObject = new Paint();
                        break;
                    case "Square":
                        currentObject = new Square();
                        currentObject.setOrigin(cache.client.x, cache.client.y)
                        break;
                    case "Rectangle":
                        currentObject = new Rectangle();
                        currentObject.setOrigin(cache.client.x, cache.client.y)
                        break;
                }

                cache.layers[cache.currentLayer].appendObject(currentObject);
            });

            canvas.addEventListener("mouseup", () => {
                currentObject = null;

                canvas.removeEventListener("mousemove", this.move);
            });

            document.addEventListener("keydown", (e) => {
                if (e.ctrlKey && e.key === "z") {
                    cache.revert();
                }
            });
        }

        revert() {
            console.log(this.layers[this.currentLayer])
            this.layers[this.currentLayer].removeObjectIndex(this.layers[this.currentLayer].objects.length - 1);
        }

        addLayer() {
            this.layers.push(new Layer(`Layer ${this.layers.length + 1}`));
            layers.innerHTML = "";

            for (let i = 0; i < this.layers.length; i++) {
                const li = document.createElement("li");
                const input = document.createElement("input");
                input.value = this.layers[i].name;
                input.setAttribute("type", "text");
                input.setAttribute("readonly", true);
                li.setAttribute("draggable", true);
                li.appendChild(input);
                layers.appendChild(li);
            }
        }

        updateClient(e) {
            const dim = canvas.getBoundingClientRect();

            this.client.x = e.clientX - dim.x;
            this.client.y = e.clientY - dim.y;
        }

        render() {
            for (let i = 0; i < this.layers.length; i++) {
                this.layers[i].render();
            }
        }

    }

    let art = new Canvas();

    canvas.resize = () => {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    canvas.loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        art.render();
        cursor.render();

        window.requestAnimationFrame(canvas.loop);
    }

    canvas.loop();

    document.addEventListener("DOMContentLoaded", () => {
        canvas.resize();
    });
    window.addEventListener("resize", function() {
        canvas.resize();
    });
})();
