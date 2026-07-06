const birdMessages = [
    '你好呀！👋', 'Hello! 😊', '今天适合喝咖啡 ☕', '天气真好！☀️',
    '要不要一起玩耍？', '啾啾~ 🐦', '记得休息一下哦！', '祝你今天好运！🍀',
    '今天也要加油！💪', '看到你真开心！😄', '世界这么大，我想去看看！🌍',
    '喝杯茶放松一下吧~ 🍵', '今天的云真好看！☁️', '早点休息哦！🌙', '保持微笑！😊',
    '努力就会有收获！💯', '哇，今天心情不错！✨', '要吃点零食吗？🍪',
    '美好的一天开始了！🌞', '加油加油！🚀', '别太累了！💆', '我是一只快乐的小鸟！🎵',
    '今天也要元气满满！💖', '有什么好玩的事吗？🎮', '读书使人进步！📚', '运动一下吧！🏃',
    '听首歌放松心情！🎶', '生活真美好！🌈', '明天会更好！🌟', '你是最棒的！👍'
];

const birdGreetings = [
    '嘿！好久不见！👋', '你好呀！最近怎么样？', '啾啾！见到你真开心！🐦',
    '嗨！一起飞吧！✨', '今天天气真好，对吧？☀️', '你也出来玩呀！😄',
    '最近有什么有趣的事吗？', '要不要一起唱歌？🎵', '早上好呀！🌞',
    '晚上好！今天辛苦了！🌙', '哇，你飞得真快！🚀', '我们去那边看看吧！👀',
    '你的羽毛真漂亮！💖', '要不要休息一下？🍵', '今天也是美好的一天！🌈',
    '见到你真好！😊', '你要去哪里呀？🌍', '一起去找食物吧！🍪',
    '你的歌声真好听！🎶', '我们做朋友吧！🤝', '今天玩得开心吗？😄',
    '明天见！👋', '小心点飞哦！⚠️', '你飞得好高呀！🗼',
    '这里风景不错！🌳', '要不要比赛谁飞得快？🏁', '你看起来精神不错！💪',
    '一起去冒险吧！🧭', '好巧啊！又遇到你了！🎉', '祝你好运！🍀',
    '嘿，朋友！最近忙什么呢？', '今天空气真清新！🌬️', '你今天的造型真酷！😎',
    '我们去山顶看看吧！⛰️', '要不要一起晒太阳？🌞', '你唱歌真好听！🎤',
    '我发现了一个好地方！🗺️', '一起去海边吧！🌊', '今天真适合飞行！✈️',
    '你真棒！👍', '要不要来个飞行比赛？🏆', '我喜欢你的羽毛颜色！🌈',
    '今天真开心能见到你！🥰', '我们去森林里探险吧！🌲', '嘿！等等我！🏃',
    '你飞得好优雅！💃', '今天也是元气满满！✨', '一起找虫子吃吧！🐛',
    '你的眼睛真漂亮！👀', '我们去看日落吧！🌅', '好久没聊天了！💬',
    '今天心情不错嘛！😊', '一起去湖边喝水吧！💧', '你看起来很开心！😄',
    '要不要一起筑巢？🏠', '你的翅膀真有力！💪', '今天风好大呀！🌬️',
    '我们去城市上空看看吧！🏙️', '你好呀！新朋友！👋', '一起唱歌吧！🎵',
    '今天真好玩！🎉', '你飞得真稳！✈️', '要不要休息一下喝口水？🍵',
    '这里的风景真美！🌄', '我们去草原上玩吧！🌿', '你的叫声真好听！🐦',
    '今天运气真好！🍀', '一起去追蝴蝶吧！🦋', '你真聪明！🧠',
    '要不要一起玩捉迷藏？🙈', '你的羽毛好柔软！☁️', '今天真忙碌！💼',
    '我们去看星星吧！⭐', '你飞得真高！🗼', '要不要一起找食物？🍽️',
    '你看起来很饿！🍖', '一起去冒险吧！⚔️', '你的尾巴真漂亮！🎀',
    '今天天气真热！🔥', '我们去树荫下乘凉吧！🌳', '你真勇敢！💪',
    '要不要一起游泳？🏊', '你的歌声真动人！🎶', '今天真美好！🌸',
    '一起去爬山吧！⛰️', '你飞得真快！⚡', '要不要一起看月亮？🌙',
    '你的嘴巴真锋利！🔪', '今天真安静！🤫', '我们去田野里玩吧！🌾',
    '你真可爱！🥰', '要不要一起跳舞？💃', '你的姿态真优雅！👑',
    '今天真热闹！🎉', '一起去河边吧！🌊', '你飞得真远！🌍',
    '要不要一起晒太阳？☀️', '你的羽毛真闪亮！💎', '今天真舒服！😌',
    '我们去花园里玩吧！🌹', '你真活泼！🐾', '要不要一起飞翔？🦅',
    '你的眼神真灵动！👀', '今天真开心！😄', '一起去云端看看吧！☁️',
    '你飞得真好！👏', '要不要一起休息？😴', '你的翅膀真漂亮！🦋',
    '今天真凉爽！❄️', '我们去树林里玩吧！🌲', '你真友善！🤝',
    '要不要一起玩耍？🎮', '你的叫声真响亮！🔊', '今天真有趣！🤩',
    '一起去天空中翱翔吧！✈️', '你飞得真优美！🎨', '要不要一起找花朵？🌸',
    '你的羽毛真蓬松！☁️', '今天真惬意！🍵', '我们去草地上玩吧！🌿',
    '你真调皮！😜', '要不要一起追逐？🏃', '你的嘴巴真可爱！👄',
    '今天真温暖！❤️', '一起去屋顶上吧！🏠', '你飞得真轻松！😌',
    '要不要一起唱歌？🎤', '你的眼睛真明亮！✨', '今天真愉快！😊',
    '我们去山谷里玩吧！⛰️', '你真勤劳！🐝', '要不要一起筑巢？🧱',
    '你的翅膀真强壮！💪', '今天真刺激！🎢', '一起去悬崖边吧！🪨',
    '你飞得真勇敢！🦅', '要不要一起看风景？👀', '你的羽毛真光滑！💎',
    '今天真平静！🌊', '我们去小溪边玩吧！💧', '你真聪明！🧠',
    '要不要一起找朋友？👥', '你的叫声真悦耳！🎵', '今天真美好！🌈',
    '一起去花丛中吧！🌺', '你飞得真漂亮！✨', '要不要一起喝水？💧',
    '你的尾巴真灵巧！🎀', '今天真有趣！🎈', '我们去芦苇丛玩吧！🌾',
    '你真可爱！🐥', '要不要一起玩耍？🎾', '你的姿态真优美！💃',
    '今天真开心！🥳', '一起去湖边吧！🏞️', '你飞得真快！🚀',
    '要不要一起休息？🛋️', '你的羽毛真多彩！🌈', '今天真惬意！🍷',
    '我们去沙丘上玩吧！🏜️', '你真活泼！🐇', '要不要一起飞翔？🦋',
    '你的眼睛真迷人！💖', '今天真温暖！🌞', '一起去森林里吧！🌲',
    '你飞得真高！🏔️', '要不要一起吃东西？🍽️', '你的嘴巴真锋利！⚔️',
    '今天真热闹！🎭', '我们去广场上玩吧！🏛️', '你真友善！💕',
    '要不要一起聊天？💬', '你的叫声真响亮！📢', '今天真开心！😄',
    '一起去山上吧！⛰️', '你飞得真优美！🎨', '要不要一起看日出？🌅',
    '你的羽毛真柔软！🤱', '今天真舒服！🛌', '我们去花园里吧！🌹',
    '你真勇敢！🦸', '要不要一起冒险？🧗', '你的翅膀真有力！💥',
    '今天真刺激！🔥', '一起去海边吧！🌊', '你飞得真稳！✈️',
    '要不要一起休息？😌', '你的尾巴真漂亮！🎈', '今天真好！😊',
    '我们去田野里吧！🌾', '你真可爱！🐾', '要不要一起唱歌？🎵',
    '你的眼睛真漂亮！👁️', '今天真开心！🤗', '一起去云端吧！☁️',
    '你飞得真快！⚡', '要不要一起玩耍？🎮', '你的羽毛真闪亮！✨',
    '今天真美好！🌸'
];

const birdEatMessages = [
    '好好吃！😋', '太美味了！🍽️', '谢谢你的食物！❤️', '好吃好吃！🍪',
    '真好吃呀！😁', '美味极了！😍', '这是什么？好好吃！🤤', '再来一点！🍞',
    '吃饱啦！😄', '谢谢你喂我！🙏'
];

class Bird {
    constructor(elementId, startX, startY, houseId) {
        this.bird = document.getElementById(elementId);
        this.birdInner = this.bird.querySelector('.bird-inner');
        this.house = document.getElementById(houseId);
        this.currentX = startX;
        this.currentY = startY;
        this.targetX = startX;
        this.targetY = startY;
        this.isPerched = false;
        this.isGreeting = false;
        this.isSleeping = false;
        this.animationId = null;
        this.flightDelay = null;
        this.flipDirection = 1;
        
        this.wire = document.createElement('div');
        this.wire.className = 'bird-wire';
        document.body.appendChild(this.wire);
        
        this.speechBubble = document.createElement('div');
        this.speechBubble.className = 'bird-speech-bubble';
        document.body.appendChild(this.speechBubble);
        
        this.init();
    }

    init() {
        this.bird.style.left = this.currentX + 'px';
        this.bird.style.top = this.currentY + 'px';
        
        this.bird.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.isPerched && !this.isGreeting && !this.isSleeping) {
                this.showPerched();
            }
        });
        
        this.bird.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.isPerched && !this.isGreeting && !this.isSleeping) {
                this.showPerched();
            }
        }, { passive: false });
        
        this.flyToRandomPosition();
    }

    getRandomPosition() {
        const padding = 80;
        return {
            x: padding + Math.random() * (window.innerWidth - padding * 2),
            y: padding + Math.random() * (window.innerHeight - padding * 2)
        };
    }

    flyToRandomPosition() {
        if (this.isPerched || this.isGreeting || this.isSleeping) return;
        
        const target = this.getRandomPosition();
        this.targetX = target.x;
        this.targetY = target.y;
        
        this.flipDirection = this.targetX > this.currentX ? 1 : -1;
        this.birdInner.style.transform = `scaleX(${this.flipDirection})`;
        
        this.animateFlight();
    }

    animateFlight() {
        if (this.isPerched || this.isGreeting || this.isSleeping) return;

        const dx = this.targetX - this.currentX;
        const dy = this.targetY - this.currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            setTimeout(() => this.flyToRandomPosition(), 1000 + Math.random() * 2000);
            return;
        }

        const speed = 0.8 + Math.random() * 0.5;
        this.currentX += (dx / distance) * speed;
        this.currentY += (dy / distance) * speed + Math.sin(Date.now() / 300) * 0.3;

        this.bird.style.left = this.currentX + 'px';
        this.bird.style.top = this.currentY + 'px';

        this.animationId = requestAnimationFrame(() => this.animateFlight());
    }

    showPerched() {
        this.isPerched = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        this.bird.classList.remove('bird-flying');
        this.bird.classList.add('bird-perched');
        
        const perchX = Math.max(100, Math.min(window.innerWidth - 100, this.currentX));
        const perchY = Math.max(100, Math.min(window.innerHeight - 200, this.currentY));
        
        this.bird.style.left = perchX + 'px';
        this.bird.style.top = perchY + 'px';
        this.birdInner.style.transform = 'scaleX(1)';
        
        this.wire.style.left = (perchX + 30) + 'px';
        this.wire.style.top = (perchY + 40) + 'px';
        this.wire.style.display = 'block';
        
        const randomMessage = birdMessages[Math.floor(Math.random() * birdMessages.length)];
        this.speechBubble.textContent = randomMessage;
        this.speechBubble.style.left = (perchX - 20) + 'px';
        this.speechBubble.style.top = (perchY - 80) + 'px';
        
        setTimeout(() => {
            this.speechBubble.classList.add('show');
        }, 100);
        
        this.flightDelay = setTimeout(() => {
            this.hidePerched();
        }, 4000);
    }

    hidePerched() {
        this.isPerched = false;
        
        this.speechBubble.classList.remove('show');
        
        setTimeout(() => {
            this.wire.style.display = 'none';
            this.bird.classList.remove('bird-perched');
            this.bird.classList.add('bird-flying');
            this.flyToRandomPosition();
        }, 300);
    }

    greet(otherBird) {
        this.isGreeting = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        this.bird.classList.remove('bird-flying');
        this.bird.classList.add('bird-perched');
        
        const midX = (this.currentX + otherBird.currentX) / 2;
        const midY = (this.currentY + otherBird.currentY) / 2;
        
        const offset = this === birdBlue ? -40 : 40;
        const perchX = midX + offset;
        const perchY = midY;
        
        this.bird.style.left = perchX + 'px';
        this.bird.style.top = perchY + 'px';
        this.birdInner.style.transform = `scaleX(${offset > 0 ? -1 : 1})`;
        
        this.wire.style.left = (perchX + 30) + 'px';
        this.wire.style.top = (perchY + 40) + 'px';
        this.wire.style.display = 'block';
        
        const greeting = birdGreetings[Math.floor(Math.random() * birdGreetings.length)];
        this.speechBubble.textContent = greeting;
        
        const bubbleOffset = offset > 0 ? 20 : -80;
        this.speechBubble.style.left = (perchX + bubbleOffset) + 'px';
        this.speechBubble.style.top = (perchY - 80) + 'px';
        
        setTimeout(() => {
            this.speechBubble.classList.add('show');
        }, 100);
    }

    endGreet() {
        this.isGreeting = false;
        
        this.speechBubble.classList.remove('show');
        
        setTimeout(() => {
            this.wire.style.display = 'none';
            this.bird.classList.remove('bird-perched');
            this.bird.classList.add('bird-flying');
            this.flyToRandomPosition();
        }, 300);
    }

    goToSleep() {
        if (this.isSleeping) return;
        
        this.isSleeping = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        const houseRect = this.house.getBoundingClientRect();
        const houseX = houseRect.left + houseRect.width / 2 - 30;
        const houseY = houseRect.top + houseRect.height - 30;
        
        this.targetX = houseX;
        this.targetY = houseY;
        this.flipDirection = this.targetX > this.currentX ? 1 : -1;
        this.birdInner.style.transform = `scaleX(${this.flipDirection})`;
        
        this.animateFlightToHouse();
    }

    animateFlightToHouse() {
        if (!this.isSleeping) return;
        
        const dx = this.targetX - this.currentX;
        const dy = this.targetY - this.currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            this.bird.style.display = 'none';
            this.house.classList.add('birdhouse-sleeping');
            return;
        }
        
        const speed = 3 + Math.random();
        this.currentX += (dx / distance) * speed;
        this.currentY += (dy / distance) * speed;
        
        this.bird.style.left = this.currentX + 'px';
        this.bird.style.top = this.currentY + 'px';
        
        this.animationId = requestAnimationFrame(() => this.animateFlightToHouse());
    }

    wakeUp() {
        if (!this.isSleeping) return;
        
        this.isSleeping = false;
        this.house.classList.remove('birdhouse-sleeping');
        this.bird.style.display = 'block';
        
        this.bird.classList.remove('bird-perched');
        this.bird.classList.add('bird-flying');
        
        setTimeout(() => {
            this.flyToRandomPosition();
        }, 500);
    }

    eat() {
        if (this.isSleeping) return;
        
        this.speechBubble.classList.remove('show');
        
        const eatMessage = birdEatMessages[Math.floor(Math.random() * birdEatMessages.length)];
        this.speechBubble.textContent = eatMessage;
        this.speechBubble.style.left = (this.currentX - 20) + 'px';
        this.speechBubble.style.top = (this.currentY - 80) + 'px';
        
        setTimeout(() => {
            this.speechBubble.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            this.speechBubble.classList.remove('show');
        }, 3000);
    }
}

let birdBlue, birdOrange;
let SUPABASE_URL, SUPABASE_KEY;

function initBirds(supabaseUrl, supabaseKey) {
    SUPABASE_URL = supabaseUrl;
    SUPABASE_KEY = supabaseKey;
    
    birdBlue = new Bird('bird-blue', window.innerWidth * 0.3, window.innerHeight * 0.5, 'birdhouse-blue');
    birdOrange = new Bird('bird-orange', window.innerWidth * 0.7, window.innerHeight * 0.5, 'birdhouse-orange');
    
    let lastGreetTime = 0;
    setInterval(() => {
        if (birdBlue.isPerched || birdOrange.isPerched || birdBlue.isGreeting || birdOrange.isGreeting || birdBlue.isSleeping || birdOrange.isSleeping) {
            return;
        }
        
        const dx = birdBlue.currentX - birdOrange.currentX;
        const dy = birdBlue.currentY - birdOrange.currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const now = Date.now();
        if (distance < 150 && now - lastGreetTime > 10000) {
            birdBlue.greet(birdOrange);
            birdOrange.greet(birdBlue);
            lastGreetTime = now;
            
            setTimeout(() => {
                birdBlue.endGreet();
                birdOrange.endGreet();
            }, 4000);
        }
    }, 500);

    function generateRandomSleepSchedule() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        const numPeriods = Math.floor(Math.random() * 3) + 2;
        const periods = [];
        
        for (let i = 0; i < numPeriods; i++) {
            let startHour, startMinute, duration;
            
            if (i === 0) {
                startHour = 21 + Math.floor(Math.random() * 3);
                startMinute = Math.floor(Math.random() * 60);
                duration = 30 + Math.floor(Math.random() * 60);
            } else if (i === 1 && numPeriods > 1) {
                startHour = 11 + Math.floor(Math.random() * 3);
                startMinute = Math.floor(Math.random() * 60);
                duration = 15 + Math.floor(Math.random() * 45);
            } else {
                const rand = Math.random();
                if (rand < 0.33) {
                    startHour = 9 + Math.floor(Math.random() * 2);
                    startMinute = Math.floor(Math.random() * 60);
                    duration = 5 + Math.floor(Math.random() * 20);
                } else if (rand < 0.66) {
                    startHour = 14 + Math.floor(Math.random() * 3);
                    startMinute = Math.floor(Math.random() * 60);
                    duration = 5 + Math.floor(Math.random() * 20);
                } else {
                    startHour = 16 + Math.floor(Math.random() * 3);
                    startMinute = Math.floor(Math.random() * 60);
                    duration = 5 + Math.floor(Math.random() * 20);
                }
            }
            
            const startTotal = startHour * 60 + startMinute;
            const endTotal = Math.min(startTotal + duration, 24 * 60);
            
            periods.push({
                start: startTotal,
                end: endTotal,
                duration: duration
            });
        }
        
        periods.sort((a, b) => a.start - b.start);
        
        return {
            date: dateStr,
            periods: periods,
            created_at: new Date().toISOString()
        };
    }
    
    async function getTodaySleepSchedule() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/bird_sleep_schedule?date=eq.${dateStr}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    return JSON.parse(data[0].schedule);
                }
            }
        } catch (error) {
            console.error('Error fetching sleep schedule:', error);
        }
        
        return null;
    }
    
    async function saveSleepSchedule(schedule) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/bird_sleep_schedule`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: schedule.date,
                    schedule: JSON.stringify(schedule)
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error saving sleep schedule:', errorData);
            }
        } catch (error) {
            console.error('Error saving sleep schedule:', error);
        }
    }
    
    async function updateSleepScheduleForNewDay() {
        const schedule = generateRandomSleepSchedule();
        await saveSleepSchedule(schedule);
        return schedule;
    }
    
    let currentSleepSchedule = null;
    let activePeriodIndex = -1;
    
    async function initSleepSchedule() {
        currentSleepSchedule = await getTodaySleepSchedule();
        
        if (!currentSleepSchedule) {
            currentSleepSchedule = generateRandomSleepSchedule();
            await saveSleepSchedule(currentSleepSchedule);
        }
        
        checkSleepSchedule();
    }
    
    function checkSleepSchedule() {
        if (!currentSleepSchedule || !currentSleepSchedule.periods) return;
        
        const now = new Date();
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        
        let shouldBeSleeping = false;
        let currentPeriodIndex = -1;
        let nextPeriodIndex = -1;
        
        for (let i = 0; i < currentSleepSchedule.periods.length; i++) {
            const period = currentSleepSchedule.periods[i];
            if (totalMinutes >= period.start && totalMinutes < period.end) {
                shouldBeSleeping = true;
                currentPeriodIndex = i;
            } else if (totalMinutes < period.start && nextPeriodIndex === -1) {
                nextPeriodIndex = i;
            }
        }
        
        const countdownEl = document.getElementById('bird-sleep-countdown');
        const timeLeftEl = document.getElementById('sleep-time-left');
        const nextSleepEl = document.getElementById('next-sleep-time');
        const nextWakeEl = document.getElementById('next-wake-time');
        
        if (shouldBeSleeping && activePeriodIndex !== currentPeriodIndex) {
            const period = currentSleepSchedule.periods[currentPeriodIndex];
            const timeUntilStart = (period.start - totalMinutes) * 60 * 1000;
            
            if (timeUntilStart <= 0) {
                birdBlue.goToSleep();
                birdOrange.goToSleep();
                activePeriodIndex = currentPeriodIndex;
            } else {
                setTimeout(() => {
                    birdBlue.goToSleep();
                    birdOrange.goToSleep();
                    activePeriodIndex = currentPeriodIndex;
                }, timeUntilStart);
            }
        } else if (!shouldBeSleeping && activePeriodIndex !== -1) {
            birdBlue.wakeUp();
            birdOrange.wakeUp();
            activePeriodIndex = -1;
            countdownEl.classList.remove('show');
        }
        
        if (shouldBeSleeping && activePeriodIndex === currentPeriodIndex) {
            const period = currentSleepSchedule.periods[currentPeriodIndex];
            const remainingMinutes = period.end - totalMinutes;
            const hours = Math.floor(remainingMinutes / 60);
            const minutes = remainingMinutes % 60;
            timeLeftEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            countdownEl.classList.add('show');
        }
        
        if (nextPeriodIndex !== -1) {
            const nextPeriod = currentSleepSchedule.periods[nextPeriodIndex];
            const nextSleepHour = Math.floor(nextPeriod.start / 60);
            const nextSleepMinute = nextPeriod.start % 60;
            const nextWakeHour = Math.floor(nextPeriod.end / 60);
            const nextWakeMinute = nextPeriod.end % 60;
            
            nextSleepEl.textContent = `${nextSleepHour.toString().padStart(2, '0')}:${nextSleepMinute.toString().padStart(2, '0')}`;
            nextWakeEl.textContent = `${nextWakeHour.toString().padStart(2, '0')}:${nextWakeMinute.toString().padStart(2, '0')}`;
        } else if (currentPeriodIndex !== -1) {
            const currentPeriod = currentSleepSchedule.periods[currentPeriodIndex];
            const nextWakeHour = Math.floor(currentPeriod.end / 60);
            const nextWakeMinute = currentPeriod.end % 60;
            
            nextSleepEl.textContent = '已完成';
            nextWakeEl.textContent = `${nextWakeHour.toString().padStart(2, '0')}:${nextWakeMinute.toString().padStart(2, '0')}`;
        } else {
            nextSleepEl.textContent = '--:--';
            nextWakeEl.textContent = '--:--';
        }
    }
    
    setInterval(checkSleepSchedule, 1000);
    
    function setupMidnightUpdate() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const delayUntilMidnight = midnight.getTime() - now.getTime();
        
        setTimeout(() => {
            updateSleepScheduleForNewDay().then((newSchedule) => {
                currentSleepSchedule = newSchedule;
                checkSleepSchedule();
            });
            
            setInterval(() => {
                updateSleepScheduleForNewDay().then((newSchedule) => {
                    currentSleepSchedule = newSchedule;
                    checkSleepSchedule();
                });
            }, 24 * 60 * 60 * 1000);
        }, delayUntilMidnight);
    }
    
    initSleepSchedule();
    setupMidnightUpdate();
    
    document.getElementById('birdhouse-blue').addEventListener('click', () => {
        if (birdBlue.isSleeping) {
            birdBlue.wakeUp();
        }
    });
    
    document.getElementById('birdhouse-orange').addEventListener('click', () => {
        if (birdOrange.isSleeping) {
            birdOrange.wakeUp();
        }
    });
    
    const feeder = document.getElementById('bird-feeder');
    const feederRect = feeder.getBoundingClientRect();
    const feederOriginalX = 20;
    const feederOriginalY = 100;
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    feeder.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseFloat(feeder.style.left) || feederRect.left;
        initialTop = parseFloat(feeder.style.top) || feederRect.top;
        feeder.classList.add('dragging');
    });
    
    document.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        
        e.preventDefault();
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        feeder.style.left = (initialLeft + dx) + 'px';
        feeder.style.top = (initialTop + dy) + 'px';
    });
    
    document.addEventListener('pointerup', () => {
        if (isDragging) {
            const feederBounds = feeder.getBoundingClientRect();
            let fed = false;
            
            [birdBlue, birdOrange].forEach(bird => {
                if (bird.isSleeping || fed) return;
                
                const birdBounds = bird.bird.getBoundingClientRect();
                
                if (feederBounds.left < birdBounds.right &&
                    feederBounds.right > birdBounds.left &&
                    feederBounds.top < birdBounds.bottom &&
                    feederBounds.bottom > birdBounds.top) {
                    bird.eat();
                    fed = true;
                }
            });
            
            feeder.style.left = feederOriginalX + 'px';
            feeder.style.top = feederOriginalY + 'px';
            isDragging = false;
            feeder.classList.remove('dragging');
        }
    });
}