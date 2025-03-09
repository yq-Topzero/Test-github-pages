document.addEventListener('DOMContentLoaded', () => {
    // 侧边栏相关元素
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const closeSidebarBtn = document.querySelector('.close-sidebar');
    const questionList = document.querySelector('.question-list');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    // 题目容器相关
    const questionContainer = document.getElementById('question-container');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const totalQuestions = document.getElementById('total-questions');
    const currentQuestion = document.getElementById('current-question');

    // 状态管理
    let currentIndex = 0;
    let userAnswers = []; 
    let startTime;

    // 根据课堂练习表现调整难度比例
    function getDifficultyRatios() {
        // 默认难度比例
        const defaultRatios = {
            // 选择题难度比例（简单:中等:困难）
            choice: { 
                easy: 2,    // 简单题数量
                medium: 2,  // 中等题数量
                hard: 2     // 困难题数量
            },
            // 填空题难度比例
            fill_blank: { 
                easy: 2,    // 简单题数量
                medium: 1,  // 中等题数量
                hard: 1     // 困难题数量
            }
        };

        // 获取课堂练习表现
        let performance = { correct: 0, total: 0 };
        try {
            const storedPerformance = localStorage.getItem('classPerformance');
            if (storedPerformance) {
                performance = JSON.parse(storedPerformance);
            }
        } catch (e) {
            console.error('无法获取课堂练习表现:', e);
            return defaultRatios;
        }

        // 如果没有完成课堂练习或数据异常，使用默认比例
        if (!performance.total || performance.total < 4) {
            return defaultRatios;
        }

        // 计算正确率
        const correctRate = performance.correct / performance.total;
        console.log(`课堂练习表现: ${performance.correct}/${performance.total}, 正确率: ${correctRate}`);

        // 根据正确率调整难度比例
        const adjustedRatios = {
            choice: { easy: 2, medium: 2, hard: 2 },
            fill_blank: { easy: 2, medium: 1, hard: 1 }
        };

        if (correctRate >= 0.75) {
            // 表现优秀，增加困难题目
            adjustedRatios.choice = { easy: 1, medium: 2, hard: 3 };
            adjustedRatios.fill_blank = { easy: 1, medium: 1, hard: 2 };
            console.log('表现优秀，增加困难题目');
        } else if (correctRate >= 0.5) {
            // 表现良好，增加中等题目
            adjustedRatios.choice = { easy: 1, medium: 3, hard: 2 };
            adjustedRatios.fill_blank = { easy: 1, medium: 2, hard: 1 };
            console.log('表现良好，增加中等题目');
        } else {
            // 表现一般，增加简单题目
            adjustedRatios.choice = { easy: 3, medium: 2, hard: 1 };
            adjustedRatios.fill_blank = { easy: 3, medium: 1, hard: 0 };
            console.log('表现一般，增加简单题目');
        }

        return adjustedRatios;
    }

    // 初始化系统
    async function init() {
        console.log('初始化系统...');
        startTime = new Date(); // 记录开始时间
        
        // 确保题库数据已加载
        if (!window.questionsData) {
            console.error('题库数据未加载!');
            // 创建一个简单的测试题库，以防题库未加载
            window.questionsData = {
                choice: {
                    easy: [
                        {
                            type: 'choice',
                            difficulty: 'easy',
                            question: '3除15= ?',
                            options: ['A. 3', 'B. 5', 'C. 4', 'D. 4'],
                            correct_answer: 'B',
                            explanation: '15÷3=5'
                        }
                    ],
                    medium: [],
                    hard: []
                },
                fill_blank: {
                    easy: [
                        {
                            type: 'fill_blank',
                            difficulty: 'easy',
                            question: '一张烙饼有几个面？',
                            options: ['A. 1个', 'B. 2个', 'C. 3个'],
                            correct_answer: 'B',
                            explanation: '一张烙饼有正反两面'
                        }
                    ],
                    medium: [],
                    hard: []
                }
            };
        }
        
        // 根据难度比例选择题目
        selectQuestionsByDifficulty();
        
        // 初始化界面
        initQuestionElements();
        initSidebar();
        initQuestionEvents();
        
        // 更新总题数显示
        totalQuestions.textContent = window.selectedQuestions.length;
        
        // 初始化用户答案数组
        userAnswers = new Array(window.selectedQuestions.length).fill(null);
        
        // 显示第一题
        showQuestion(0);
        
        console.log('初始化完成，共加载题目：', window.selectedQuestions.length);
    }

    // 根据难度比例选择题目
    function selectQuestionsByDifficulty() {
        // 获取根据课堂表现调整后的难度比例
        const DIFFICULTY_RATIOS = getDifficultyRatios();
        
        // 创建选择题和填空题的结果数组
        let selectedChoiceQuestions = [];
        let selectedFillBlankQuestions = [];
        
        // 处理选择题
        const choiceRatios = DIFFICULTY_RATIOS.choice;
        const totalChoiceQuestions = Object.values(choiceRatios).reduce((a, b) => a + b, 0);
        
        // 确保选择题总数为6题
        if (totalChoiceQuestions !== 6) {
            console.warn('选择题比例总和不等于6，将按比例调整');
        }
        
        // 从每个难度级别选择题目
        if (window.questionsData.choice) {
            // 简单选择题
            const easyChoiceCount = choiceRatios.easy;
            if (window.questionsData.choice.easy && window.questionsData.choice.easy.length > 0) {
                const easyQuestions = shuffleArray([...window.questionsData.choice.easy])
                    .slice(0, easyChoiceCount);
                
                // 确保每个题目的选项格式正确
                easyQuestions.forEach(q => {
                    if (q.choices && !q.options) {
                        q.options = q.choices; // 修复选项字段名不一致的问题
                    }
                });
                
                selectedChoiceQuestions = selectedChoiceQuestions.concat(easyQuestions);
            }
            
            // 中等选择题
            const mediumChoiceCount = choiceRatios.medium;
            if (window.questionsData.choice.medium && window.questionsData.choice.medium.length > 0) {
                const mediumQuestions = shuffleArray([...window.questionsData.choice.medium])
                    .slice(0, mediumChoiceCount);
                
                // 确保每个题目的选项格式正确
                mediumQuestions.forEach(q => {
                    if (q.choices && !q.options) {
                        q.options = q.choices; // 修复选项字段名不一致的问题
                    }
                });
                
                selectedChoiceQuestions = selectedChoiceQuestions.concat(mediumQuestions);
            }
            
            // 困难选择题
            const hardChoiceCount = choiceRatios.hard;
            if (window.questionsData.choice.hard && window.questionsData.choice.hard.length > 0) {
                const hardQuestions = shuffleArray([...window.questionsData.choice.hard])
                    .slice(0, hardChoiceCount);
                
                // 确保每个题目的选项格式正确
                hardQuestions.forEach(q => {
                    if (q.choices && !q.options) {
                        q.options = q.choices; // 修复选项字段名不一致的问题
                    }
                });
                
                selectedChoiceQuestions = selectedChoiceQuestions.concat(hardQuestions);
            }
        }
        
        // 处理填空题
        const fillRatios = DIFFICULTY_RATIOS.fill_blank;
        const totalFillQuestions = Object.values(fillRatios).reduce((a, b) => a + b, 0);
        
        // 确保填空题总数为4题
        if (totalFillQuestions !== 4) {
            console.warn('填空题比例总和不等于4，将按比例调整');
        }
        
        // 从每个难度级别选择题目
        if (window.questionsData.fill_blank) {
            // 简单填空题
            const easyFillCount = fillRatios.easy;
            if (window.questionsData.fill_blank.easy && window.questionsData.fill_blank.easy.length > 0) {
                selectedFillBlankQuestions = selectedFillBlankQuestions.concat(
                    shuffleArray([...window.questionsData.fill_blank.easy])
                    .slice(0, easyFillCount)
                );
            }
            
            // 中等填空题
            const mediumFillCount = fillRatios.medium;
            if (window.questionsData.fill_blank.medium && window.questionsData.fill_blank.medium.length > 0) {
                selectedFillBlankQuestions = selectedFillBlankQuestions.concat(
                    shuffleArray([...window.questionsData.fill_blank.medium])
                    .slice(0, mediumFillCount)
                );
            }
            
            // 困难填空题
            const hardFillCount = fillRatios.hard;
            if (window.questionsData.fill_blank.hard && window.questionsData.fill_blank.hard.length > 0) {
                selectedFillBlankQuestions = selectedFillBlankQuestions.concat(
                    shuffleArray([...window.questionsData.fill_blank.hard])
                    .slice(0, hardFillCount)
                );
            }
        }
        
        // 合并所有选中的题目
        window.selectedQuestions = [
            ...selectedChoiceQuestions,
            ...selectedFillBlankQuestions
        ];
        
        // 添加显示索引
        window.selectedQuestions = window.selectedQuestions.map((q, index) => ({
            ...q,
            displayIndex: index + 1
        }));
        
        console.log('已选择题目：', window.selectedQuestions.length);
        console.log('选择题：', selectedChoiceQuestions.length);
        console.log('填空题：', selectedFillBlankQuestions.length);
    }

    // 洗牌函数
    function shuffleArray(array) {
        const newArray = [...array]; // 创建副本以避免修改原数组
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // 初始化题目元素
    function initQuestionElements() {
        // 清空题目容器
        questionContainer.innerHTML = '';
        
        // 确保有题目数据
        if (!window.selectedQuestions || window.selectedQuestions.length === 0) {
            console.error('没有可用的题目数据');
            questionContainer.innerHTML = '<div class="error-message">题目加载失败，请刷新页面重试</div>';
            return;
        }
        
        // 为每个题目创建DOM元素
        window.selectedQuestions.forEach((q, index) => {
            const questionPage = document.createElement('div');
            questionPage.className = `question-page ${index === 0 ? 'active' : ''}`;
            
            // 根据题型添加不同的类名
            const questionTypeClass = q.type === 'choice' ? 'choice-question' : 'fillblank-question';
            
            questionPage.innerHTML = `
                <div class="question-content ${questionTypeClass}">
                    <p class="question-text">
                        <span class="question-number">Q${index+1}</span>
                        ${q.question}
                    </p>
                    ${q.type === 'choice' ? renderOptions(q, index) : renderFillBlank(q, index)}
                </div>`;
            questionContainer.appendChild(questionPage);
        });
    }
    
    // 渲染选择题选项
    function renderOptions(q, index) {
        // 检查选项格式
        if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
            console.error('题目选项格式错误:', q);
            return '<div class="error">选项数据错误</div>';
        }
        
        return `
        <div class="options-container">
            <ul class="options">
                ${q.options.map((opt, optIndex) => {
                    // 处理选项格式，支持多种格式
                    let optionLetter, optionText;
                    
                    if (typeof opt === 'string') {
                        if (opt.includes('.')) {
                            // 格式如 'A. 选项1'
                            const parts = opt.split('.');
                            optionLetter = parts[0].trim();
                            optionText = parts.slice(1).join('.').trim();
                        } else {
                            // 格式如 'A选项1' 或 'A'
                            optionLetter = opt.charAt(0);
                            optionText = opt.substring(1).trim();
                        }
                    } else if (Array.isArray(opt)) {
                        // 格式如 ['A', '选项1']
                        optionLetter = opt[0];
                        optionText = opt.slice(1).join(' ');
                    }
                    
                    // 如果无法解析，使用默认格式
                    if (!optionLetter) {
                        optionLetter = String.fromCharCode(65 + optIndex); // A, B, C...
                        optionText = opt;
                    }
                    
                    // 确保选项字母是单个字符
                    if (optionLetter.length > 1) {
                        optionLetter = optionLetter.charAt(0);
                    }
                    
                    return `
                    <li class="option option-${optionLetter.toLowerCase()}">
                        <input type="radio" 
                               name="q${index+1}" 
                               value="${optionLetter}" 
                               id="q${index+1}${optionLetter}">
                        <label for="q${index+1}${optionLetter}" class="choice-label">
                            <span class="option-letter">${optionLetter}</span>
                            <span class="option-text">${optionText}</span>
                        </label>
                    </li>`;
                }).join('')}
            </ul>
        </div>`;
    }
    
    // 渲染填空题
    function renderFillBlank(q, index) {
        // 如果填空题有选项，则渲染为单选题
        if (q.options && q.options.length > 0) {
            return renderOptions(q, index);
        }
        
        // 否则渲染为文本输入框
        return `
        <div class="fillblank-container">
            <div class="fillblank-group">
                <input type="text" 
                       class="fillblank-input"
                       required
                       data-index="${index}">
                <label class="fillblank-label">请输入答案</label>
                <div class="input-bar"></div>
            </div>
        </div>`;
    }

    // 初始化侧边栏
    function initSidebar() {
        // 清空原有导航
        questionList.innerHTML = '';
        
        // 确保有题目数据
        if (!window.selectedQuestions || window.selectedQuestions.length === 0) {
            console.error('没有可用的题目数据，无法初始化侧边栏');
            return;
        }
        
        // 生成题号导航
        window.selectedQuestions.forEach((_, index) => {
            const item = document.createElement('div');
            item.className = `question-item ${index === 0 ? 'current' : ''}`;
            item.innerHTML = `
                <span class="circle-number">${index + 1}</span>
            `;
            item.dataset.index = index;
            questionList.appendChild(item);
        });

        // 事件绑定
        sidebarToggle.addEventListener('click', openSidebar);
        closeSidebarBtn.addEventListener('click', closeSidebar);
        
        // 题号点击事件
        questionList.addEventListener('click', e => {
            const item = e.target.closest('.question-item');
            if (item) {
                const index = parseInt(item.dataset.index);
                showQuestion(index);
                // 移除自动关闭侧边栏的行为，让用户手动关闭
                // closeSidebar(); 
            }
        });
    }

    // 打开侧边栏
    function openSidebar() {
        sidebar.classList.add('show');
        sidebarToggle.style.visibility = 'hidden'; // 隐藏打开按钮
    }

    // 关闭侧边栏
    function closeSidebar() {
        sidebar.classList.remove('show');
        sidebarToggle.style.visibility = 'visible'; // 显示打开按钮
    }

    // 初始化题目事件
    function initQuestionEvents() {
        // 选择题事件
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', handleChoiceSelect);
        });
    
        // 填空题事件
        document.querySelectorAll('.fillblank-input').forEach(input => {
            input.addEventListener('input', handleFillInput);
            
            // 添加焦点效果
            input.addEventListener('focus', function() {
                this.parentElement.style.transform = 'translateY(-3px)';
                this.parentElement.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.style.transform = '';
                this.parentElement.style.boxShadow = '';
            });
        });
    }
    
    // 处理选择题选择
    function handleChoiceSelect() {
        const questionIndex = Array.from(questionContainer.children)
            .indexOf(this.closest('.question-page'));
        
        // 清除同组其他选项
        const options = this.closest('.options').querySelectorAll('.option');
        options.forEach(opt => {
            opt.classList.remove('selected');
            opt.querySelector('input').checked = false;
        });
    
        // 设置当前选中
        this.classList.add('selected');
        this.querySelector('input').checked = true;
        userAnswers[questionIndex] = this.querySelector('input').value;
        
        updateSidebarStatus();
    }
    
    // 处理填空题输入
    function handleFillInput(e) {
        const index = parseInt(e.target.dataset.index);
        userAnswers[index] = e.target.value.trim();
        updateSidebarStatus();
    }

    // 更新界面状态
    function updateUI() {
        currentQuestion.textContent = currentIndex + 1;
        
        // 更新按钮文本
        nextBtn.textContent = currentIndex === window.selectedQuestions.length - 1 
            ? '交卷' 
            : '下一题';
            
        // 控制上一题按钮显示
        prevBtn.style.display = currentIndex === 0 ? 'none' : 'inline-block';
    }

    // 显示指定题目
    function showQuestion(index) {
        // 确保索引有效
        if (index < 0 || index >= window.selectedQuestions.length) {
            console.error('无效的题目索引:', index);
            return;
        }
        
        currentIndex = index;
        
        // 更新题目显示
        document.querySelectorAll('.question-page').forEach((page, i) => {
            page.classList.toggle('active', i === index);
        });
    
        updateUI();
        updateSidebarStatus();
    }

    // 题目导航
    function prevQuestion() {
        if (currentIndex > 0) showQuestion(currentIndex - 1);
    }

    function nextQuestion() {
        if (currentIndex < window.selectedQuestions.length - 1) {
            showQuestion(currentIndex + 1);
        } else {
            submitQuiz();
        }
    }

    // 更新侧边栏状态
    function updateSidebarStatus() {
        // 更新进度
        const answeredCount = userAnswers.filter(a => a !== null).length;
        const progress = (answeredCount / userAnswers.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${answeredCount}/${userAnswers.length}`;

        // 更新题号状态
        document.querySelectorAll('.question-item').forEach((item, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = userAnswers[index] !== null;
            
            item.classList.toggle('current', isCurrent);
            item.classList.toggle('answered', isAnswered);
        });
    }

    // 状态变量
    let reviewData = [];

    // 计算分数函数 - 每道题10分
    function calculateScore() {
        // 每道题的分值
        const POINTS_PER_QUESTION = 10; // 默认每题10分
        
        return window.selectedQuestions.reduce((acc, q, index) => {
            // 检查答案是否正确
            const isCorrect = String(userAnswers[index] || '').toLowerCase() === 
                            String(q.correct_answer || '').toLowerCase();
            
            // 当前使用统一分值
            const points = isCorrect ? POINTS_PER_QUESTION : 0;
            
            return acc + points;
        }, 0);
    }

    // 提交测验
    function submitQuiz() {
        generateReviewData();
        
        const scoreLayer = document.querySelector('.score-layer');
        const cards = document.querySelector('.cards');
        
        // 计算分数
        const score = calculateScore();
        const totalQuestions = window.selectedQuestions.length;
        
        // 更新分数显示
        document.querySelector('.score-value').textContent = score;
        
        // 计算用时
        const timeSpent = Math.floor((new Date() - startTime) / 1000);
        document.querySelector('.time-value').textContent = `${timeSpent}s`;
        
        // 显示分数层
        scoreLayer.style.display = 'flex';
        
        // 检测是否为移动设备，自动展开详情
        if (window.innerWidth <= 768 || 'ontouchstart' in window) {
            setTimeout(() => {
                cards.classList.add('auto-expand');
            }, 1000);
        }
        
        // 绑定按钮事件
        document.querySelector('.review-btn').onclick = () => {
            scoreLayer.style.display = 'none';
            showReviewLayer();
        };
        
        document.querySelector('.restart-btn').onclick = restartQuiz;
    }

    // 重置分数卡
    function resetScoreCard() {
        const cards = document.querySelector('.cards');
        cards.classList.remove('auto-expand');
    }

    // 生成题目回顾数据
    function generateReviewData() {
        reviewData = window.selectedQuestions.map((q, index) => {
            const isCorrect = String(userAnswers[index] || '').toLowerCase() === 
                            String(q.correct_answer || '').toLowerCase();
            return {
                question: q.question,
                userAnswer: userAnswers[index] || '未回答',
                correctAnswer: q.correct_answer,
                explanation: q.explanation,
                isCorrect: isCorrect,
                type: q.type,
                displayIndex: index + 1
            };
        });
    }

    // 显示回顾层
    function showReviewLayer() {
        const reviewLayer = document.querySelector('.review-layer');
        const reviewList = document.querySelector('.review-list');
        
        // 清空之前的内容
        reviewList.innerHTML = '';
        
        // 生成题目卡片
        reviewList.innerHTML = reviewData.map((item, index) => `
            <div class="review-card ${item.type === 'choice' ? 'choice-review' : 'fillblank-review'}">
                <div class="question-number">第 ${item.displayIndex} 题</div>
                <div class="review-question">${item.question}</div>
                
                <div class="answer-status ${item.isCorrect ? 'correct' : 'wrong'}">
                    ${item.isCorrect ? '✅ 回答正确' : '❌ 回答错误'}
                </div>

                ${item.type === 'choice' ? `
                    <div class="user-answer">你的选择：${item.userAnswer}</div>
                ` : `
                    <div class="user-answer">你的答案：${item.userAnswer}</div>
                `}

                <div class="correct-answer">
                    正确答案：${item.correctAnswer}
                </div>

                ${item.explanation ? `
                    <div class="explanation">
                        <strong>解析：</strong>${item.explanation}
                    </div>
                ` : ''}
            </div>
        `).join('');

        // 显示回顾层
        reviewLayer.style.display = 'block';
        
        // 添加卡片动画
        const cards = document.querySelectorAll('.review-card');
        cards.forEach((card, index) => {
            card.style.animation = `cardEnter 0.5s ease ${index * 0.1}s both`;
        });
    }

    // 关闭回顾层
    document.querySelector('.close-review').addEventListener('click', () => {
        document.querySelector('.review-layer').style.display = 'none';
    });

    // 重新开始测验
    async function restartQuiz() {
        // 关闭所有层
        document.querySelector('.score-layer').style.display = 'none';
        document.querySelector('.review-layer').style.display = 'none';
        
        // 重置状态
        currentIndex = 0;
        startTime = new Date(); // 重置开始时间
        
        // 重新选择题目
        selectQuestionsByDifficulty();
        
        // 重新初始化
        initQuestionElements();
        initSidebar();
        initQuestionEvents();
        
        // 更新总题数显示
        totalQuestions.textContent = window.selectedQuestions.length;
        
        // 重置用户答案
        userAnswers = new Array(window.selectedQuestions.length).fill(null);
        
        // 显示第一题
        showQuestion(0);
        
        // 重置分数卡
        resetScoreCard();
    }

    // 事件绑定
    prevBtn.addEventListener('click', prevQuestion);
    nextBtn.addEventListener('click', nextQuestion);
    
    // 绑定重新开始按钮
    document.querySelectorAll('.restart-btn').forEach(btn => {
        btn.addEventListener('click', restartQuiz);
    });

    // 初始化系统
    init();
});