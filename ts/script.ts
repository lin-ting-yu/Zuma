import { Zuma } from './core.js';
import { mobileCheck } from './tool.js';
window.onload = () => {
    const isMobile = mobileCheck();
    const scoreDOM = document.body.querySelector('#score');
    const startPopup = document.body.querySelector('#start-popup');
    const stopPopup = document.body.querySelector('#stop-popup');
    const finalPopup = document.body.querySelector('#final-popup');
    const finalNum = document.body.querySelector('#final-score');

    const zumaGame = new Zuma({
        width: 1200,
        height: 800,
        scale: 0.7,
        path: `M197.519,19.289C158.282,84.171,101.52,201.053,92.5,345.418c-6.6,105.632,47,236.043,159,295.679
		s338.566,101.881,547,64.404c199-35.781,312.016-164.676,313-266c1-103-34-221.816-200-278.044
		c-142.542-48.282-346.846-37.455-471,31.044c-116,64-154.263,213.533-81,304.619c92,114.381,410,116.381,476,2.891
		c62.975-108.289-40-203.51-158-206.51`,
        playerPos: { x: 550, y: 400 },
        updateScore: (score: number) => {
            scoreDOM.innerHTML = `${score}`;
        },
        updateFinal: (isFinal: boolean) => {
            if (isFinal) {
                finalPopup.classList.add('active');
                finalNum.innerHTML = `${zumaGame.score}`;
            }
        }
    });
    zumaGame.appendTo(document.body);

    const stopBtn = document.body.querySelector('#stop-btn');
    const switchBtn = document.body.querySelector('#switch-btn');
    const shootBtn = document.body.querySelector('#shoot-btn');
    const moveBtn: HTMLElement = document.body.querySelector('#move-btn');
    const moveBtnControl: HTMLElement = moveBtn.querySelector('.move-control');

    if (!isMobile) {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && zumaGame.isInit) {
                zumaGame.stop();
                stopPopup.classList.add('active');
            }
        });
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            if (!zumaGame && e.code !== 'Space') {
                return
            }
            e.preventDefault();
            zumaGame.switchMarble();
        });
        window.addEventListener("mousemove", (e: MouseEvent) => {
            if (!zumaGame) {
                return;
            }
            zumaGame.lookAt(e.pageX, e.pageY);
        });
        window.addEventListener("click", (e: MouseEvent) => {
            zumaGame.attack();
        });
    } else {
        document.body.classList.add('is-mobile');
        let isTouchstart = false;
        const rotate = (e: TouchEvent) => {
            const isMove = [...e.touches].find(event => event.target === moveBtn);
            if (!zumaGame && !isTouchstart && !isMove) {
                return;
            }
            const rect = moveBtn.getBoundingClientRect();
            const innerX = rect.x + rect.width / 2;
            const innerY = rect.y + rect.height / 2;
            zumaGame.lookAtVector(isMove.pageX - innerX, isMove.pageY - innerY);
            moveBtnControl.style.transform = `translate(-50%, -150%) rotate(${zumaGame.getPlayerRotate()}deg)`;
        }
        switchBtn.addEventListener('click', () => {
            if (!zumaGame) {
                return;
            }
            zumaGame.switchMarble();
        });
        shootBtn.addEventListener('click', () => {
            if (!zumaGame) {
                return;
            }
            zumaGame.attack();
        });
        stopBtn.addEventListener('click', () => {
            if (!zumaGame) {
                return;
            }
            zumaGame.stop();
            stopBtn.classList.add('active');
            stopPopup.classList.add('active');
        });
        moveBtn.addEventListener('touchstart', (e: TouchEvent) => {
            isTouchstart = true;
            rotate(e);
        });
        window.addEventListener('touchend', (e) => {
            isTouchstart = false;
        })
        window.addEventListener('touchmove', rotate);
    }

    startPopup.querySelector('#init-btn').addEventListener('click', () => {
        startPopup.classList.remove('active');
        zumaGame.start();
    });
    stopPopup.querySelector('#start-btn').addEventListener('click', () => {
        stopPopup.classList.remove('active');
        stopBtn.classList.remove('active');
        setTimeout(() => {
            zumaGame.start();
        }, 100);
    });
    stopPopup.querySelector('#reset-btn').addEventListener('click', () => {
        stopPopup.classList.remove('active');
        stopBtn.classList.remove('active');
        zumaGame.reset().start();
    });
    finalPopup.querySelector('#restart-btn').addEventListener('click', () => {
        finalPopup.classList.remove('active');
        zumaGame.reset().start();
    });

    const resize = () => {
        zumaGame.setScale(Math.min(
            window.innerHeight / zumaGame.height,
            window.innerWidth / zumaGame.width,
            1
        ));
    };
    window.addEventListener('resize', resize);
    resize();

    // window.addEventListener('blur', function (e) {
    //     if (zumaGame.isInit && !zumaGame.isFinal) {
    //         zumaGame.stop();
    //         stopPopup.classList.add('active');
    //     }
    // });
};

