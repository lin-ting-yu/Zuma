const OneFrameTime = 17;
const createDiv = (classList, children = []) => {
    const div = document.createElement("div");
    div.classList.add(...classList);
    children.forEach((ele) => {
        div.appendChild(ele);
    });
    return div;
};
const createElementNS = (name, attr) => {
    const xmlns = "http://www.w3.org/2000/svg";
    const elementNS = document.createElementNS(xmlns, name);
    Object.keys(attr).forEach((key) => {
        elementNS.setAttributeNS(null, key, attr[key]);
    });
    return elementNS;
};
class Marble {
    constructor({ color = `#ff2244` }) {
        this.ID = `${(~~(Math.random() * 1000000000))
            .toString(16)
            .toLocaleUpperCase()}`;
        this.DOM = createDiv(["marble"]);
        this.Color = color;
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
        this.parent = null;
        return this;
    }
    overlap(marble) {
        let r = Marble.Size -
            Math.sqrt(Math.pow((this.x - marble.x), 2) + Math.pow((this.y - marble.y), 2));
        return r;
    }
}
Marble.Size = 60;
class Player {
    constructor({ x = 0, y = 0 }) {
        this.Marble = createDiv(["marble-1"]);
        this.NextMarbleList = [createDiv(["marble-2"]), createDiv(["marble-2"]), createDiv(["marble-2"])];
        this.DOM = createDiv(["player"], [
            this.Marble,
            ...this.NextMarbleList
        ]);
        this.X = x;
        this.Y = y;
        this.DOM.style.transform = `translate(calc(${this.X}px - 50%), calc(${this.Y}px - 50%)) rotate(0deg)`;
    }
    lookAt(x, y) {
        if (!this.parent) {
            return this;
        }
        this.lookX = x;
        this.lookY = y;
        const rect = this.DOM.getBoundingClientRect();
        const innerX = rect.left + (rect.right - rect.left) / 2;
        const innerY = rect.top + (rect.bottom - rect.top) / 2;
        this.rotate = Math.atan2(this.lookY - innerY, this.lookX - innerX) * 180 / Math.PI + 90;
        this.DOM.style.transform = `translate(calc(${this.X}px - 50%), calc(${this.Y}px - 50%)) rotate(${this.rotate}deg)`;
        return this;
    }
    appendTo(parent) {
        this.parent = parent;
        this.parent.appendChild(this.DOM);
        return this;
    }
    setMarbleColor(color) {
        this.Marble.style.backgroundColor = color;
        return this;
    }
    setNextMarbleColor(color) {
        this.NextMarbleList.forEach(dom => {
            dom.style.backgroundColor = color;
        });
        return this;
    }
    getVector() {
        const innerRotate = this.rotate - 90;
        return {
            x: Math.cos(innerRotate * Math.PI / 180) * 30,
            y: Math.sin(innerRotate * Math.PI / 180) * 30,
        };
    }
}
class Zuma {
    constructor(data) {
        this.AllMarbleLength = 100;
        this.InitMarbleLength = 20;
        this.Container = createDiv(["container"], [
            createDiv(['leaf', 'leaf-01']),
            createDiv(['leaf', 'leaf-02']),
            createDiv(['leaf', 'leaf-03']),
            createDiv(['leaf', 'leaf-04']),
            createDiv(['leaf', 'leaf-05']),
            createDiv(['leaf', 'leaf-06'])
        ]);
        this.Path = createElementNS("path", {});
        this.moveSpeed = 4;
        this.autoAddMarbleCount = 0;
        this.marbleDataList = [];
        this.marbleBoomList = [];
        this.marbleColorCount = {};
        this.moveTimes = 0;
        this.isStart = false;
        this._isInit = false;
        this._isFinal = false;
        this.windowEventList = [];
        this.checkDeleteAfterTouchData = {};
        this.playerMarble = {
            now: null,
            next: null
        };
        this._score = 0;
        this.width = data.width;
        this.height = data.height;
        const svg = createElementNS("svg", {
            x: "0px",
            y: "0px",
            width: `${data.width}px`,
            height: `${data.height}px`,
            viewBox: `0 0 ${data.width} ${data.height}`,
        });
        svg.appendChild(this.Path);
        this.Path.setAttributeNS(null, "d", data.path);
        this.PathLength = this.Path.getTotalLength();
        const startHolePos = this.Path.getPointAtLength(0);
        const finalHolePos = this.Path.getPointAtLength(this.PathLength);
        const startHole = createDiv(['start-hole']);
        const finalHole = createDiv(['final-hole']);
        startHole.style.left = `${startHolePos.x}px`;
        startHole.style.top = `${startHolePos.y}px`;
        finalHole.style.left = `${finalHolePos.x}px`;
        finalHole.style.top = `${finalHolePos.y}px`;
        this.Container.appendChild(startHole);
        this.Container.appendChild(finalHole);
        this.Container.style.width = `${data.width}px`;
        this.Container.style.height = `${data.height}px`;
        this.Container.style.transform = `scale(${data.scale || 1})`;
        this.Player = new Player(data.playerPos);
        this.Player.appendTo(this.Container);
        this.colorList = [...Zuma.DefaultColorList];
        this.colorList.forEach((color) => {
            this.marbleColorCount[color] = 0;
        });
        this.updateScore = data.updateScore;
        this.updateFinal = data.updateFinal;
    }
    get isInit() {
        return this._isInit;
    }
    set isFinal(isFinal) {
        this._isFinal = isFinal;
        this.updateFinal && this.updateFinal(this._isFinal);
    }
    get isFinal() {
        return this._isFinal;
    }
    set score(score) {
        this._score = score;
        this.updateScore && this.updateScore(this._score);
    }
    get score() {
        return this._score;
    }
    start() {
        this.isStart = true;
        this.time = new Date().getTime();
        if (!this.windowEventList.length) {
            this.bindEvent();
        }
        this.animation();
        return this;
    }
    stop() {
        this.isStart = false;
        return this;
    }
    reset() {
        this.isStart = false;
        this._isInit = false;
        this.isFinal = false;
        this.autoAddMarbleCount = 0;
        this.score = 0;
        this.moveSpeed = 4;
        this.colorList = [...Zuma.DefaultColorList];
        this.marbleDataList.forEach(d => d.marble.remove());
        this.marbleBoomList.forEach(d => d.marble.remove());
        this.marbleDataList.length = 0;
        this.marbleBoomList.length = 0;
        this.checkDeleteAfterTouchData = {};
        this.playerMarble.now = null;
        this.playerMarble.next = null;
        this.Player
            .setMarbleColor('')
            .setNextMarbleColor('');
        Object.keys(this.marbleColorCount).forEach((color) => {
            this.marbleColorCount[color] = 0;
        });
        return this;
    }
    destroy() {
        this.reset();
        if (this.parent) {
            this.parent.removeChild(this.Container);
        }
        this.windowEventList.forEach(d => {
            window.removeEventListener(d.name, d.fn);
        });
        this.windowEventList = [];
    }
    appendTo(parent) {
        this.parent = parent;
        this.parent.appendChild(this.Container);
        return this;
    }
    attack() {
        if (!this.Player || !this.playerMarble.now || !this.playerMarble.next) {
            return this;
        }
        const vector = this.Player.getVector();
        this.marbleBoomList.push({
            marble: this.playerMarble.now,
            speed: vector
        });
        this.playerMarble.now.appendTo(this.Container);
        this.playerMarble.now.setPosition(this.Player.X, this.Player.Y);
        this.playerMarble.now = this.playerMarble.next;
        this.playerMarble.next = this.createMarble();
        this.Player
            .setMarbleColor(this.playerMarble.now.Color)
            .setNextMarbleColor(this.playerMarble.next.Color);
        return this;
    }
    init() {
        const innerTime = new Date().getTime();
        if (this.marbleDataList.length >= this.InitMarbleLength && this.isStart) {
            this._isInit = true;
            this.moveSpeed = 20;
            this.moveTimes = this.moveSpeed;
            this.playerMarble.now = this.createMarble();
            this.playerMarble.next = this.createMarble();
            this.Player
                .setMarbleColor(this.playerMarble.now.Color)
                .setNextMarbleColor(this.playerMarble.next.Color);
            return this;
        }
        if (innerTime - this.time < OneFrameTime * 4) {
            return this;
        }
        this.time = innerTime;
        this.unshiftMarble();
        return this;
    }
    moveMoveMarbleData() {
        const firstMarble = this.marbleDataList[0];
        if (!firstMarble) {
            return;
        }
        if (firstMarble.percent >= 0.99) {
            this.score -= 1;
            this.removeMarbleFromDataList(firstMarble.marble);
        }
        const moveNum = Marble.Size / this.moveSpeed;
        firstMarble.percent += moveNum / this.PathLength;
        const pos = this.Path.getPointAtLength(firstMarble.percent * this.PathLength);
        firstMarble.marble.setPosition(pos.x, pos.y);
        let prevMarble = firstMarble;
        const deleteList = [];
        for (let i = 1; i < this.marbleDataList.length; i++) {
            const marbleData = this.marbleDataList[i];
            if (marbleData.percent >= 0.99) {
                this.score -= 1;
                this.removeMarbleFromDataList(marbleData.marble, i);
                continue;
            }
            const overlap = prevMarble.marble.overlap(marbleData.marble);
            if (overlap > 0 || prevMarble.percent > marbleData.percent) {
                // 檢查退回後修不需要刪除
                if (this.checkDeleteAfterTouchData[marbleData.marble.ID]) {
                    delete this.checkDeleteAfterTouchData[marbleData.marble.ID];
                    if (marbleData.marble.Color === prevMarble.marble.Color) {
                        const list = this.getNeerSameMarble(marbleData.marble);
                        if (list.length >= 3) {
                            deleteList.push(...list);
                        }
                    }
                }
                if (prevMarble.percent > marbleData.percent) {
                    marbleData.percent = prevMarble.percent + Marble.Size / this.PathLength;
                }
                else {
                    marbleData.percent += overlap / this.PathLength;
                }
            }
            else if (overlap < -5 && marbleData.percent > prevMarble.percent) {
                if (overlap < -Marble.Size) {
                    this.checkDeleteAfterTouchData[marbleData.marble.ID] = true;
                }
                const moveNum = (Marble.Size / this.moveSpeed) * 4;
                marbleData.percent -= moveNum / this.PathLength;
            }
            const pos = this.Path.getPointAtLength(marbleData.percent * this.PathLength);
            marbleData.marble.setPosition(pos.x, pos.y);
            prevMarble = marbleData;
        }
        deleteList.forEach(marble => {
            this.score += 3;
            this.removeMarbleFromDataList(marble);
        });
    }
    moveMoveMarbleBoom() {
        if (!this.marbleBoomList.length) {
            return;
        }
        // TODO: 有空優化成分區檢測
        const marbleDataList = this.marbleDataList;
        const deleteData = [];
        this.marbleBoomList.forEach(data => {
            data.marble.setPosition(data.marble.x + data.speed.x, data.marble.y + data.speed.y);
            for (let i = 0; i < marbleDataList.length; i++) {
                const marbleData = marbleDataList[i];
                const overlap = data.marble.overlap(marbleData.marble);
                if (overlap > 5) {
                    if (data.marble.Color === marbleData.marble.Color) {
                        const sameList = this.getNeerSameMarble(marbleData.marble);
                        if (sameList.length >= 2) {
                            this.score += sameList.length;
                            sameList.forEach(marble => {
                                this.removeMarbleFromDataList(marble);
                            });
                            deleteData.push(Object.assign(Object.assign({}, data), { isMove: false }));
                            return;
                        }
                    }
                    this.addMarbleToNeer(data.marble, marbleData);
                    deleteData.push(Object.assign(Object.assign({}, data), { isMove: true }));
                    return;
                }
            }
            if (Math.abs(data.marble.x) > this.width || Math.abs(data.marble.y) > this.height) {
                deleteData.push(Object.assign(Object.assign({}, data), { isMove: false }));
            }
        });
        deleteData.forEach((date) => {
            const index = this.marbleBoomList.findIndex(d => d.marble.ID === date.marble.ID);
            this.marbleBoomList.splice(index, 1);
            if (!date.isMove) {
                date.marble.remove();
                this.marbleColorCount[date.marble.Color]--;
            }
        });
    }
    removeMarbleFromDataList(marble, index = this.marbleDataList.findIndex(d => d.marble.ID === marble.ID)) {
        delete this.checkDeleteAfterTouchData[marble.ID];
        this.marbleDataList[index].marble.remove();
        this.marbleDataList.splice(index, 1);
        this.marbleColorCount[marble.Color]--;
        return this;
    }
    addMarbleToNeer(marble, target) {
        const index = this.marbleDataList.findIndex(d => d.marble.ID === target.marble.ID);
        const prevPos = this.Path.getPointAtLength((target.percent - Marble.Size / this.PathLength) * this.PathLength);
        const nextPos = this.Path.getPointAtLength((target.percent + Marble.Size / this.PathLength) * this.PathLength);
        const prevGap = Math.pow((prevPos.x - marble.x), 2) + Math.pow((prevPos.y - marble.y), 2);
        const nextGap = Math.pow((nextPos.x - marble.x), 2) + Math.pow((nextPos.y - marble.y), 2);
        if (prevGap < nextGap) {
            this.marbleDataList.splice(index - 1, 0, {
                marble,
                percent: target.percent - Marble.Size / this.PathLength / 2
            });
        }
        else {
            this.marbleDataList.splice(index, 0, {
                marble,
                percent: target.percent + Marble.Size / this.PathLength / 2
            });
        }
        return this;
    }
    createMarble() {
        const marble = new Marble({ color: this.getColor() });
        this.marbleColorCount[marble.Color]++;
        return marble;
    }
    unshiftMarble() {
        const marble = this.createMarble();
        marble.appendTo(this.Container);
        this.marbleDataList.unshift({
            marble,
            percent: 0,
        });
        this.autoAddMarbleCount++;
        return this;
    }
    getColor() {
        const index = ~~(Math.random() * this.colorList.length);
        const color = this.colorList[index];
        if (this.marbleColorCount[color] || this.colorList.length === 1 || !this.isInit) {
            return color;
        }
        this.colorList.splice(index, 1);
        return this.getColor();
    }
    getNeerSameMarble(marble) {
        let checkMarble;
        const index = this.marbleDataList.findIndex((ele) => ele.marble.ID === marble.ID);
        const neerList = [marble];
        checkMarble = marble;
        for (let i = index + 1; i < this.marbleDataList.length; i++) {
            const nowMarble = this.marbleDataList[i].marble;
            if (nowMarble.Color === checkMarble.Color &&
                nowMarble.overlap(checkMarble) > (Marble.Size / -10)) {
                checkMarble = nowMarble;
                neerList.push(nowMarble);
            }
            else {
                break;
            }
        }
        checkMarble = marble;
        for (let i = index - 1; i >= 0; i--) {
            const nowMarble = this.marbleDataList[i].marble;
            if (nowMarble.Color === checkMarble.Color &&
                nowMarble.overlap(checkMarble) > (Marble.Size / -10)) {
                checkMarble = nowMarble;
                neerList.push(nowMarble);
            }
            else {
                break;
            }
        }
        return neerList;
    }
    animation() {
        if (!this.isStart) {
            return;
        }
        requestAnimationFrame(() => this.animation());
        if (!this.isInit) {
            this.init().moveMoveMarbleData();
            return;
        }
        const innerTime = new Date().getTime();
        if (innerTime - this.time < OneFrameTime) {
            return;
        }
        this.time = innerTime;
        if (this.moveTimes === this.moveSpeed &&
            this.autoAddMarbleCount < this.AllMarbleLength) {
            this.unshiftMarble();
            this.moveTimes = 0;
        }
        this.moveMoveMarbleBoom();
        this.moveMoveMarbleData();
        this.moveTimes++;
        if (this.marbleDataList.length === 0) {
            this.isFinal = true;
        }
    }
    bindEvent() {
        const mousemove = (e) => {
            if (!this.Player) {
                return;
            }
            this.Player.lookAt(e.pageX, e.pageY);
        };
        const click = (e) => {
            if (!this.isStart || this.isFinal || !this.isInit) {
                return;
            }
            this.attack();
            if (e.button === 1) {
            }
        };
        const keydown = (e) => {
            if (!this.isStart || this.isFinal || !this.isInit) {
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.Player && this.playerMarble.now && this.playerMarble.next) {
                    [this.playerMarble.now, this.playerMarble.next] = [this.playerMarble.next, this.playerMarble.now];
                    this.Player
                        .setMarbleColor(this.playerMarble.now.Color)
                        .setNextMarbleColor(this.playerMarble.next.Color);
                }
            }
        };
        window.addEventListener("mousemove", mousemove);
        window.addEventListener("click", click);
        window.addEventListener("keydown", keydown);
        this.windowEventList.push({ name: 'mousemove', fn: mousemove }, { name: 'click', fn: click }, { name: 'keydown', fn: keydown });
    }
}
Zuma.DefaultColorList = ["#0C3406", "#077187", "#74A57F", "#ABD8CE", "#E4C5AF"];
window.onload = () => {
    const scoreDOM = document.body.querySelector('#score .num');
    const startPopup = document.body.querySelector('#start');
    const stopPopup = document.body.querySelector('#stop');
    const finalPopup = document.body.querySelector('#final');
    const finalNum = finalPopup.querySelector('.num');
    const zumaGame = new Zuma({
        width: 1200,
        height: 800,
        scale: 0.7,
        path: `M235.5-36.5c0,0-129,157.858-143,381.918c-6.6,105.632,47,236.043,159,295.679s338.566,101.881,547,64.404
    c199-35.781,312.016-164.676,313-266c1-103-34-221.816-200-278.044c-142.542-48.282-346.846-37.455-471,31.044
    c-116,64-154.263,213.533-81,304.619c92,114.381,410,116.381,476,2.891c62.975-108.289-40-203.51-158-206.51`,
        playerPos: { x: 550, y: 400 },
        updateScore: (score) => {
            scoreDOM.innerHTML = `${score}`;
        },
        updateFinal: (isFinal) => {
            if (isFinal) {
                finalPopup.classList.add('active');
                finalNum.innerHTML = `${zumaGame.score}`;
            }
        }
    });
    zumaGame.appendTo(document.body);
    startPopup.querySelector('.button').addEventListener('click', () => {
        startPopup.classList.remove('active');
        zumaGame.start();
    });
    stopPopup.querySelector('#start-btn').addEventListener('click', () => {
        stopPopup.classList.remove('active');
        setTimeout(() => {
            zumaGame.start();
        }, 100);
    });
    stopPopup.querySelector('#reset-btn').addEventListener('click', () => {
        stopPopup.classList.remove('active');
        zumaGame.reset().start();
    });
    finalPopup.querySelector('.button').addEventListener('click', () => {
        finalPopup.classList.remove('active');
        zumaGame.reset().start();
    });
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && zumaGame.isInit) {
            zumaGame.stop();
            stopPopup.classList.add('active');
        }
    });
    window.addEventListener('blur', function (e) {
        if (zumaGame.isInit && !zumaGame.isFinal) {
            zumaGame.stop();
            stopPopup.classList.add('active');
        }
    });
};
