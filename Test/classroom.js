// classroom.js
// 课堂练习专用逻辑
const CORRECT_ANSWERS = { q1: 'B', q2: 'B', q3: 'A', q4: 'B' };
let currentIndex = 0;

// 测试模式开关（true: 不保存进度，false: 正常记录）
const TEST_MODE = false; 

document.addEventListener('DOMContentLoaded', () => {
    // 初始化时清除测试数据
    if(TEST_MODE) {
        localStorage.removeItem('classProgress');
        localStorage.removeItem('classPerformance');
        console.log('测试模式已启用，本地存储已清除');
    }

    // 初始化进度
    function initProgress() {
        if(!localStorage.getItem('classProgress') && !TEST_MODE) {
            localStorage.setItem('classProgress', JSON.stringify({}));
        }
        if(!localStorage.getItem('classPerformance') && !TEST_MODE) {
            localStorage.setItem('classPerformance', JSON.stringify({
                correct: 0,
                total: 0
            }));
        }
        restoreProgress();
        updateProgressDisplay();
    }

    // 恢复已保存的进度
    function restoreProgress() {
        const progress = JSON.parse(localStorage.getItem('classProgress'));
        Object.keys(progress).forEach(questionId => {
            const input = document.querySelector(`input[name="${questionId}"][value="${progress[questionId]}"]`);
            if(input) input.checked = true;
        });
    }

    // 保存答题进度
    function saveProgress(questionId, answer) {
        if(TEST_MODE) return; // 测试模式不保存
        
        const progress = JSON.parse(localStorage.getItem('classProgress'));
        progress[questionId] = answer;
        localStorage.setItem('classProgress', JSON.stringify(progress));
        
        // 记录答题正确性
        const performance = JSON.parse(localStorage.getItem('classPerformance'));
        performance.total++;
        if(answer === CORRECT_ANSWERS[questionId]) {
            performance.correct++;
        }
        localStorage.setItem('classPerformance', JSON.stringify(performance));
        
        updateProgressDisplay();
        checkCompletion();
    }

    // 更新进度显示
    function updateProgressDisplay() {
        const progress = JSON.parse(localStorage.getItem('classProgress'));
        const answeredCount = Object.keys(progress).filter(k => progress[k]).length;
        document.getElementById('progress-count').textContent = answeredCount;
    }

    // 检查是否完成
    function checkCompletion() {
        const progress = JSON.parse(localStorage.getItem('classProgress'));
        if(Object.keys(progress).length === 4) {
            document.querySelector('.complete-layer').style.display = 'block';
            document.querySelector('.next-btn').disabled = true;
        }
    }

    // 题目切换逻辑（新增答案验证）
    document.querySelector('.next-btn').addEventListener('click', () => {
        const currentQuestion = `q${currentIndex + 1}`;
        const selected = document.querySelector(`input[name="${currentQuestion}"]:checked`);
        
        if (!selected) {
            showFeedback('请先选择答案！');
            return;
        }
        
        // 保存答案
        saveProgress(currentQuestion, selected.value);
        
        // 显示反馈
        const isCorrect = selected.value === CORRECT_ANSWERS[currentQuestion];
        showFeedback(isCorrect ? '回答正确！' : '回答错误', isCorrect);
        
        // 无论对错都延迟进入下一题
        setTimeout(() => {
            if(currentIndex < 3) {
                switchQuestion(currentIndex + 1);
            }
        }, 1500);
    });

    document.querySelector('.prev-btn').addEventListener('click', () => {
        if(currentIndex > 0) {
            switchQuestion(currentIndex - 1);
        }
    });

    // 显示反馈的样式
    function showFeedback(message, isSuccess = true) {
        const feedback = document.createElement('div');
        feedback.className = `feedback ${isSuccess ? 'success' : 'error'}`;
        feedback.textContent = message;
        
        document.querySelector('.quiz-container').appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
    }

    function switchQuestion(newIndex) {
        const pages = document.querySelectorAll('.question-page');
        pages[currentIndex].classList.remove('active');
        currentIndex = newIndex;
        pages[currentIndex].classList.add('active');
    }

    // 选项选择事件
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // 只记录选择，不自动跳转
            const questionId = e.target.name;
            const answer = e.target.value;
            // 不在这里保存进度，而是在点击下一题时保存
        });
    });

    // 跳转按钮事件
    document.getElementById('goto-homework').addEventListener('click', () => {
        const progress = JSON.parse(localStorage.getItem('classProgress'));
        if(Object.keys(progress).length === 4) {
            window.location.href = 'Test/test.html';
        } else {
            alert('请先完成所有课堂练习题！');
        }
    });

    // 初始化
    initProgress();
});
