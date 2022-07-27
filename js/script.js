const OneFrameTime = 17;
class Marble {
    constructor({ color = `#ff2244` }) {
        this.ID = `${(~~(Math.random() * 1000000000))
            .toString(16)
            .toLocaleUpperCase()}`;
        this.DOM = document.createElement("div");
        this.Color = color;
        this.DOM.classList.add("marble");
        this.DOM.style.backgroundColor = this.Color;
        this.DOM.style.width = `${Marble.Size}px`;
        this.DOM.style.height = `${Marble.Size}px`;
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        if (this.DOM) {
            this.DOM.style.transform = `translate(calc(${this.x}px - 50%), calc(${this.y}px - 50%))`;
        }
        return this;
    }
    appendTo(parent) {
        this.parent = parent;
        parent.appendChild(this.DOM);
        return this;
    }
    remove() {
        if (!this.parent) {
            return this;
        }
        this.parent.removeChild(this.DOM);
        return this;
    }
    overlap(marble) {
        let r = Marble.Size - Math.sqrt(Math.pow((this.x - marble.x), 2) + Math.pow((this.y - marble.y), 2));
        return r;
    }
}
Marble.Size = 60;
class Zuma {
    constructor(data) {
        this.AllMarbleLength = 100;
        this.InitMarbleLength = 20;
        this.Container = document.createElement("div");
        this.moveSpeed = 4;
        this.autoAddMarbleCount = 0;
        this.marbleDataList = [];
        // private prevAddTime: number = 0;
        this.moveTime = 0;
        this.colorData = ["#ff2244", "#115599", "#dddddd", '#449944', '#660000'];
        this.marbleCount = {};
        this.isStart = false;
        this.isInit = false;
        this._isFinal = false;
        this._blood = 100;
        const xmlns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(xmlns, "svg");
        this.Path = document.createElementNS(xmlns, "path");
        this.Path.setAttributeNS(null, 'd', data.path);
        svg.appendChild(this.Path);
        svg.setAttributeNS(null, 'x', '0px');
        svg.setAttributeNS(null, 'y', "0px");
        svg.setAttributeNS(null, 'width', `${data.width}px`);
        svg.setAttributeNS(null, 'height', `${data.height}px`);
        svg.setAttributeNS(null, 'viewBox', `0 0 ${data.width} ${data.height}`);
        this.Container.classList.add('container');
        this.Container.style.width = `${data.width}px`;
        this.Container.style.height = `${data.height}px`;
        this.Container.style.transform = `scale(${data.scale || 1})`;
        this.PathLength = this.Path.getTotalLength();
        this.colorData.forEach((color) => {
            this.marbleCount[color] = 0;
        });
    }
    get isFinal() {
        return this._isFinal;
    }
    get blood() {
        return this._blood;
    }
    start() {
        this.isStart = true;
        this.time = new Date().getTime();
        this.animation();
        return this;
    }
    stop() {
        this.isStart = false;
        return this;
    }
    reset() {
        this.isStart = false;
        this.isInit = false;
        this.marbleDataList.length = 0;
        this.autoAddMarbleCount = 0;
        this.moveSpeed = 4;
        Object.keys(this.marbleCount).forEach(color => {
            this.marbleCount[color] = 0;
        });
        return this;
    }
    createMarble() {
        return new Marble({ color: this.getColor() });
    }
    appendTo(parent) {
        parent.appendChild(this.Container);
        return this;
    }
    init() {
        const innerTime = new Date().getTime();
        if (this.marbleDataList.length >= this.InitMarbleLength) {
            this.isInit = true;
            this.moveSpeed = 20;
            this.moveTime = this.moveSpeed;
            return this;
        }
        if (innerTime - this.time < OneFrameTime * 4) {
            return this;
        }
        this.time = innerTime;
        this.unshiftMarble();
        return this;
    }
    moveMarble() {
        const firstMarble = this.marbleDataList[0];
        if (!firstMarble) {
            return;
        }
        if (firstMarble.percent >= 0.99) {
            firstMarble.marble.remove();
            this.marbleDataList.splice(0, 1);
        }
        const moveNum = Marble.Size / this.moveSpeed;
        firstMarble.percent += (moveNum) / this.PathLength;
        const pos = this.Path.getPointAtLength(firstMarble.percent * this.PathLength);
        firstMarble.marble.setPosition(pos.x, pos.y);
        let prevMarble = firstMarble.marble;
        for (let i = 1; i < this.marbleDataList.length; i++) {
            const marbleData = this.marbleDataList[i];
            if (marbleData.percent >= 0.99) {
                marbleData.marble.remove();
                this.marbleDataList.splice(i, 1);
                continue;
            }
            const overlap = prevMarble.overlap(marbleData.marble);
            if (overlap > 0) {
                marbleData.percent += overlap / this.PathLength;
            }
            else if (overlap < -5) {
                const moveNum = Marble.Size / this.moveSpeed * 4;
                marbleData.percent -= moveNum / this.PathLength;
            }
            const pos = this.Path.getPointAtLength(marbleData.percent * this.PathLength);
            marbleData.marble.setPosition(pos.x, pos.y);
            prevMarble = marbleData.marble;
        }
    }
    getColor() {
        // TODO: 這裡要加判斷
        return this.colorData[~~(Math.random() * 4)];
    }
    unshiftMarble() {
        const marble = this.createMarble();
        marble.appendTo(this.Container);
        this.marbleCount[marble.Color]++;
        this.marbleDataList.unshift({
            marble,
            percent: 0,
        });
        this.autoAddMarbleCount++;
        marble.DOM.addEventListener('click', () => {
            this.removeMarble(marble);
        });
        return this;
    }
    getMarbleSameNeer(marble) {
        const index = this.marbleDataList.findIndex(ele => ele.marble.ID === marble.ID);
        const neerList = [];
        neerList[index] = marble;
        for (let i = index + 1; i < this.marbleDataList.length; i++) {
            if (this.marbleDataList[i].marble.Color === marble.Color) {
                neerList[i] = this.marbleDataList[i].marble;
            }
            else {
                break;
            }
        }
        for (let i = index - 1; i >= 0; i--) {
            if (this.marbleDataList[i].marble.Color === marble.Color) {
                neerList[i] = this.marbleDataList[i].marble;
            }
            else {
                break;
            }
        }
        return neerList;
    }
    removeMarble(marble) {
        const index = this.marbleDataList.findIndex(ele => ele.marble.ID === marble.ID);
        const deleteIndexList = [];
        deleteIndexList[index] = true;
        marble.remove();
        for (let i = index + 1; i < this.marbleDataList.length; i++) {
            if (this.marbleDataList[i].marble.Color === marble.Color) {
                deleteIndexList[i] = true;
                this.marbleCount[marble.Color]--;
                this.marbleDataList[i].marble.remove();
            }
            else {
                break;
            }
        }
        for (let i = index - 1; i >= 0; i--) {
            if (this.marbleDataList[i].marble.Color === marble.Color) {
                deleteIndexList[i] = true;
                this.marbleCount[marble.Color]--;
                this.marbleDataList[i].marble.remove();
            }
            else {
                break;
            }
        }
        this.marbleDataList = this.marbleDataList.filter((_, i) => !deleteIndexList[i]);
        return this;
    }
    animation() {
        if (!this.isStart) {
            return;
        }
        requestAnimationFrame(() => this.animation());
        if (!this.isInit) {
            this.init().moveMarble();
            return;
        }
        const innerTime = new Date().getTime();
        if (innerTime - this.time < OneFrameTime) {
            return;
        }
        this.time = innerTime;
        if (this.moveTime === this.moveSpeed) {
            this.unshiftMarble();
            this.moveTime = 0;
        }
        this.moveMarble();
        this.moveTime++;
    }
}
const zumaGame = new Zuma({
    width: 1200,
    height: 800,
    scale: 0.7,
    path: `M235.5-36.5c0,0-129,157.858-143,381.918c-6.6,105.632,47,236.043,159,295.679s338.566,101.881,547,64.404
	c199-35.781,312.016-164.676,313-266c1-103-34-221.816-200-278.044c-142.542-48.282-346.846-37.455-471,31.044
	c-116,64-154.263,213.533-81,304.619c92,114.381,410,116.381,476,2.891c62.975-108.289-40-203.51-158-206.51`,
    playerPos: { x: 550, y: 400 }
});
zumaGame.appendTo(document.body);
zumaGame.start();
