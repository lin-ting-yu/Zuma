import { OneFrameTime, createDiv, createElementNS } from './tool.js';

interface MarbleData {
  marble: Marble;
  percent: number;
}

interface MarbleBoomData {
  marble: Marble;
  speed: { x: number; y: number; };
}

class Marble {
  constructor({ color = `#ff2244` }) {
    this.Color = color;
    this.DOM.style.backgroundColor = this.Color;
    this.DOM.style.width = `${Marble.Size}px`;
    this.DOM.style.height = `${Marble.Size}px`;
  }
  static readonly Size = 60;
  readonly ID = `${(~~(Math.random() * 1000000000))
    .toString(16)
    .toLocaleUpperCase()}`;
  readonly DOM: HTMLElement = createDiv(["marble"]);
  readonly Color: string;
  private parent: HTMLElement | null;
  x: number;
  y: number;

  setPosition(x: number, y: number): Marble {
    this.x = x;
    this.y = y;
    return this;
  }

  overlap(marble: Marble): number {
    let r =
      Marble.Size -
      Math.sqrt((this.x - marble.x) ** 2 + (this.y - marble.y) ** 2);
    return r;
  }
}

class Player {
  constructor({ x = 0, y = 0 }) {
    this.X = x;
    this.Y = y;
    this.DOM.style.transform = `translate(calc(${this.X}px - 50%), calc(${this.Y}px - 50%)) rotate(0deg)`;
  }
  readonly Marble: HTMLElement = createDiv(["marble-1"]);
  readonly NextMarbleList: HTMLElement[] = [createDiv(["marble-2"]), createDiv(["marble-2"]), createDiv(["marble-2"])];
  readonly DOM: HTMLElement = createDiv(["player"], [
    this.Marble,
    ...this.NextMarbleList
  ]);
  readonly X: number;
  readonly Y: number;
  
  private parent: HTMLElement;
  rotate: number = 0;

  lookAt(x: number, y: number): Player {
    if (!this.parent) {
      return this;
    }
    const rect = this.DOM.getBoundingClientRect();
    const innerX = rect.left + (rect.right - rect.left) / 2;
    const innerY = rect.top + (rect.bottom - rect.top) / 2;
    return this.lookAtVector(x - innerX, y - innerY);
  }
  lookAtVector(x: number, y: number): Player {
    this.rotate = Math.atan2(y, x) * 180 / Math.PI + 90;
    this.DOM.style.transform = `translate(calc(${this.X}px - 50%), calc(${this.Y}px - 50%)) rotate(${this.rotate}deg)`;
    return this;
  }
  appendTo(parent: HTMLElement): Player {
    this.parent = parent;
    this.parent.appendChild(this.DOM);
    return this;
  }
  setMarbleColor(color: string): Player {
    this.Marble.style.backgroundColor = color;
    return this;
  }
  setNextMarbleColor(color: string): Player {
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

export class Zuma {
  constructor(data: {
    width: number;
    height: number;
    path: string;
    scale: number;
    playerPos: { x: number; y: number; };
    updateScore?: (score: number) => void;
    updateFinal?: (isFinal: boolean) => void;
  }) {
    this.width = data.width;
    this.height = data.height;
    const svg: SVGSVGElement = createElementNS("svg", {
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
    this.Canvas.width = data.width * window.devicePixelRatio;
    this.Canvas.height = data.height * window.devicePixelRatio;
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
  static readonly DefaultColorList = ["#0C3406", "#077187", "#74A57F", "#ABD8CE", "#E4C5AF"];
  readonly width: number;
  readonly height: number;
  private readonly updateScore: (score: number) => void;
  private readonly updateFinal: (isFinal: boolean) => void;
  private readonly AllMarbleLength = 100;
  private readonly InitMarbleLength = 20;
  private readonly Canvas: HTMLCanvasElement = document.createElement('canvas');
  private readonly Container: HTMLElement = createDiv(["container"], [
    this.Canvas,
    createDiv(['leaf', 'leaf-01']),
    createDiv(['leaf', 'leaf-02']),
    createDiv(['leaf', 'leaf-03']),
    createDiv(['leaf', 'leaf-04']),
    createDiv(['leaf', 'leaf-05']),
    createDiv(['leaf', 'leaf-06'])
  ]);
  private readonly Path: SVGPathElement = createElementNS("path", {});
  private readonly PathLength: number;
  private parent: HTMLElement;
  private moveSpeed: number = 4;
  private autoAddMarbleCount = 0;
  private marbleDataList: MarbleData[] = [];
  private marbleBoomList: MarbleBoomData[] = [];
  private marbleColorCount = {};
  private time: number;
  private moveTimes: number = 0;
  private colorList: string[];
  private isStart = false;
  private _isInit = false;
  private _isFinal = false;
  // private windowEventList: { name: string, fn: (...e) => void; }[] = [];
  private checkDeleteAfterTouchData: { [marbleId: string]: boolean; } = {};

  private readonly Player: Player;
  private playerMarble: {
    now: Marble | null;
    next: Marble | null;
  } = {
      now: null,
      next: null
    };

  private _score = 0;

  get isInit(): boolean {
    return this._isInit;
  }

  set isFinal(isFinal: boolean) {
    this._isFinal = isFinal;
    this.updateFinal && this.updateFinal(this._isFinal);
  }
  get isFinal(): boolean {
    return this._isFinal;
  }

  set score(score: number) {
    this._score = score;
    this.updateScore && this.updateScore(this._score);
  }
  get score(): number {
    return this._score;
  }

  start(): Zuma {
    this.isStart = true;
    this.time = new Date().getTime();
    // if (!this.windowEventList.length) {
    //   this.bindEvent();
    // }
    this.animation();
    return this;
  }

  stop(): Zuma {
    this.isStart = false;
    return this;
  }

  reset(): Zuma {
    this.isStart = false;
    this._isInit = false;
    this.isFinal = false;
    this.autoAddMarbleCount = 0;
    this.score = 0;
    this.moveSpeed = 4;
    this.colorList = [...Zuma.DefaultColorList];
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

  setScale(scale: number): Zuma {
    this.Container.style.transform = `scale(${scale || 1})`;
    return this;
  }

  destroy(): void {
    this.reset();
    if (this.parent) {
      this.parent.removeChild(this.Container);
    }
    // this.windowEventList.forEach(d => {
    //   window.removeEventListener(d.name, d.fn);
    // });
    // this.windowEventList = [];
  }

  appendTo(parent: HTMLElement): Zuma {
    this.parent = parent;
    this.parent.appendChild(this.Container);
    return this;
  }

  switchMarble(): Zuma {
    if (!this.isStart || this.isFinal || !this.isInit) {
      return this;
    }
    if (this.Player && this.playerMarble.now && this.playerMarble.next) {
      [this.playerMarble.now, this.playerMarble.next] = [this.playerMarble.next, this.playerMarble.now];
      this.Player
        .setMarbleColor(this.playerMarble.now.Color)
        .setNextMarbleColor(this.playerMarble.next.Color);
    }
    return this;
  }

  attack(): Zuma {
    if (
      !this.isStart || this.isFinal || !this.isInit ||
      !this.Player || !this.playerMarble.now || !this.playerMarble.next
    ) {
      return this;
    }
    const vector = this.Player.getVector();
    this.marbleBoomList.push({
      marble: this.playerMarble.now,
      speed: vector
    });
    this.playerMarble.now.setPosition(this.Player.X, this.Player.Y);
    this.playerMarble.now = this.playerMarble.next;
    this.playerMarble.next = this.createMarble();
    this.Player
      .setMarbleColor(this.playerMarble.now.Color)
      .setNextMarbleColor(this.playerMarble.next.Color);
    return this;
  }

  lookAt(x: number, y: number): Zuma {
    if (!this.Player) {
      return this;
    }
    this.Player.lookAt(x, y);
    return this;
  }

  lookAtVector(x: number, y: number): Zuma {
    if (!this.Player) {
      return this;
    }
    this.Player.lookAtVector(x, y);
    return this;
  }

  getPlayerRotate(): number {
    return this.Player.rotate;
  }

  private init(): Zuma {
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

  private moveMoveMarbleData(): void {
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
    const pos = this.Path.getPointAtLength(
      firstMarble.percent * this.PathLength
    );
    firstMarble.marble.setPosition(pos.x, pos.y);

    let prevMarble: MarbleData = firstMarble;
    const deleteList: Marble[] = [];
    for (let i = 1; i < this.marbleDataList.length; i++) {
      const marbleData = this.marbleDataList[i];
      if (marbleData.percent >= 0.99) {
        this.score -= 1;
        this.removeMarbleFromDataList(marbleData.marble, i);
        continue;
      }
      const overlap = prevMarble.marble.overlap(marbleData.marble);
      if (overlap > 0) {
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
        marbleData.percent += overlap / this.PathLength;
      } else if (overlap < -5 && marbleData.percent > prevMarble.percent) {
        if (overlap < -Marble.Size) {
          this.checkDeleteAfterTouchData[marbleData.marble.ID] = true;
        }
        const moveNum = (Marble.Size / this.moveSpeed) * 4;
        marbleData.percent -= moveNum / this.PathLength;
      }
      const pos = this.Path.getPointAtLength(
        marbleData.percent * this.PathLength
      );
      marbleData.marble.setPosition(pos.x, pos.y);
      prevMarble = marbleData;
    }
    deleteList.forEach(marble => {
      this.score += 3;
      this.removeMarbleFromDataList(marble);
    });
  }

  private moveMoveMarbleBoom(): void {
    if (!this.marbleBoomList.length) {
      return;
    }

    // TODO: 有空優化成分區檢測
    const marbleDataList = this.marbleDataList;
    const deleteData: (MarbleBoomData & { isMove: boolean; })[] = [];
    this.marbleBoomList.forEach(data => {
      data.marble.setPosition(
        data.marble.x + data.speed.x,
        data.marble.y + data.speed.y
      );
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
              deleteData.push({ ...data, isMove: false });
              return;
            }
          }
          this.addMarbleToNeer(data.marble, marbleData);
          deleteData.push({ ...data, isMove: true });
          return;
        }
      }
      if (Math.abs(data.marble.x) > this.width || Math.abs(data.marble.y) > this.height) {
        deleteData.push({ ...data, isMove: false });
      }
    });
    deleteData.forEach((date) => {
      const index = this.marbleBoomList.findIndex(d => d.marble.ID === date.marble.ID);
      this.marbleBoomList.splice(index, 1);
      if (!date.isMove) {
        this.marbleColorCount[date.marble.Color]--;
      }
    });
  }

  private removeMarbleFromDataList(
    marble: Marble,
    index = this.marbleDataList.findIndex(d => d.marble.ID === marble.ID)
  ): Zuma {
    delete this.checkDeleteAfterTouchData[marble.ID];
    this.marbleDataList.splice(index, 1);
    this.marbleColorCount[marble.Color]--;
    return this;
  }

  private addMarbleToNeer(marble: Marble, target: MarbleData): Zuma {
    const index = this.marbleDataList.findIndex(d => d.marble.ID === target.marble.ID);
    const oneMarblePercent = Marble.Size / this.PathLength;
    const prevPos = this.Path.getPointAtLength(
      (target.percent - oneMarblePercent) * this.PathLength
    );
    const nextPos = this.Path.getPointAtLength(
      (target.percent + oneMarblePercent) * this.PathLength
    );
    const prevGap = (prevPos.x - marble.x) ** 2 + (prevPos.y - marble.y) ** 2;
    const nextGap = (nextPos.x - marble.x) ** 2 + (nextPos.y - marble.y) ** 2;
    if (prevGap < nextGap) {
      this.marbleDataList.splice(index, 0, {
        marble,
        percent: target.percent - oneMarblePercent / 2
      });
    } else {
      this.marbleDataList.splice(index + 1, 0, {
        marble,
        percent: target.percent + oneMarblePercent / 2
      });
    }
    return this;
  }

  private createMarble(): Marble {
    const marble = new Marble({ color: this.getColor() });
    this.marbleColorCount[marble.Color]++;
    return marble;
  }

  private unshiftMarble(): Zuma {
    const marble = this.createMarble();
    this.marbleDataList.unshift({
      marble,
      percent: 0,
    });
    this.autoAddMarbleCount++;
    return this;
  }

  private getColor(): string {
    const index = ~~(Math.random() * this.colorList.length);
    const color = this.colorList[index];
    if (this.marbleColorCount[color] || this.colorList.length === 1 || !this.isInit) {
      return color;
    }
    this.colorList.splice(index, 1);
    return this.getColor();
  }

  private getNeerSameMarble(marble: Marble): Marble[] {
    const index = this.marbleDataList.findIndex(
      (ele) => ele.marble.ID === marble.ID
    );
    const neerList: Marble[] = [marble];
    for (let i = index + 1; i < this.marbleDataList.length; i++) {
      if (this.marbleDataList[i].marble.Color === marble.Color) {
        neerList.push(this.marbleDataList[i].marble);
      } else {
        break;
      }
    }
    for (let i = index - 1; i >= 0; i--) {
      if (this.marbleDataList[i].marble.Color === marble.Color) {
        neerList.push(this.marbleDataList[i].marble);
      } else {
        break;
      }
    }
    return neerList;
  }

  private drawCanvas(): void {
    const ctx = this.Canvas.getContext('2d');
    const r = Marble.Size / 2 * window.devicePixelRatio;
    const PI2 = 2 * Math.PI; 
    ctx.clearRect(0, 0, this.Canvas.width, this.Canvas.height);
    this.marbleDataList.forEach(marble => {
      ctx.beginPath(); 
      ctx.fillStyle = marble.marble.Color;
      ctx.arc(
        marble.marble.x * window.devicePixelRatio, 
        marble.marble.y * window.devicePixelRatio, 
        r, 
        0, 
        PI2
        );
      ctx.closePath(); 
      ctx.fill()
    });
    this.marbleBoomList.forEach(marble => {
      ctx.beginPath(); 
      ctx.fillStyle = marble.marble.Color;
      ctx.arc(
        marble.marble.x * window.devicePixelRatio, 
        marble.marble.y * window.devicePixelRatio, 
        r, 
        0, 
        PI2
        );
      ctx.closePath(); 
      ctx.fill();
    });
  }

  private animation(): void {
    if (!this.isStart) {
      return;
    }
    requestAnimationFrame(() => this.animation());
    if (!this.isInit) {
      this.init().moveMoveMarbleData();
      this.drawCanvas();
      return;
    }
    const innerTime = new Date().getTime();
    if (innerTime - this.time < OneFrameTime) {
      return;
    }
    this.time = innerTime;
    if (
      this.moveTimes === this.moveSpeed &&
      this.autoAddMarbleCount < this.AllMarbleLength
    ) {
      this.unshiftMarble();
      this.moveTimes = 0;
    }
    this.moveMoveMarbleBoom();
    this.moveMoveMarbleData();
    this.drawCanvas();
    this.moveTimes++;
    if (this.marbleDataList.length === 0) {
      this.isFinal = true;
    }
  }
}