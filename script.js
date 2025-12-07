// --- Global Data Store and Initialization ---

let sessions = JSON.parse(localStorage.getItem('studySessions')) || [];
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_SESSION_MINUTES = 60; // Standard block for scheduling

// --- Helper Functions (No Change) ---

function saveSessions() {
    localStorage.setItem('studySessions', JSON.stringify(sessions));
    renderPlannerView();
    updateStats();
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateDuration(start, end) {
    return timeToMinutes(end) - timeToMinutes(start);
}

// --- View Switching Logic (NEW) ---

/**
 * Handles the view transition with a slide/fade animation.
 * @param {string} targetId - The ID of the section to show.
 * @param {HTMLElement} activeLink - The clicked navigation link element.
 */
function switchView(targetId, activeLink) {
    const contentViews = document.querySelectorAll('.content-view');
    const activeView = document.querySelector('.content-view.active-view');
    const navLinks = document.querySelectorAll('.nav-link');
    const targetView = document.getElementById(targetId);

    if (activeView && activeView.id === targetId) return; // Already on this view

    // 1. Update Navigation
    navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');

    // 2. Animate Out (Slide Left)
    if (activeView) {
        activeView.classList.remove('active-view');
        activeView.classList.add('slide-out');
        activeView.style.position = 'absolute'; // Temporarily absolute for transition
        activeView.style.visibility = 'hidden';
    }

    // 3. Animate In (Slide Right)
    targetView.classList.add('slide-in');
    targetView.style.visibility = 'visible';
    targetView.style.position = 'absolute';

    // Wait for the slide-out animation to finish before snapping position
    setTimeout(() => {
        if (activeView) {
            activeView.classList.remove('slide-out');
            activeView.style.position = 'absolute'; // Keep it hidden off-screen
        }
        
        // Final State for the target view
        targetView.classList.remove('slide-in');
        targetView.classList.add('active-view');
        targetView.style.position = 'relative'; // Take up space
        targetView.style.transform = 'translateX(0)';
        
    }, 50); // Small delay to register slide-in class before transition starts

    // Run necessary render functions when switching views
    if (targetId === 'planner') {
        renderPlannerView(document.querySelector('.view-toggle button.active')?.getAttribute('data-view') || 'day');
    } else if (targetId === 'stats') {
        updateStats();
    }
}


// --- DOM Initialization and Event Listeners ---

function addTopicInput(topic = '', weight = 2) {
    // ... (Function implementation remains the same)
    const list = document.getElementById('topics-list');
    const div = document.createElement('div');
    div.classList.add('input-row', 'topic-row');
    div.innerHTML = `
        <input type="text" name="topic-name" placeholder="Topic Name (e.g., Fourier Transform)" value="${topic}" required>
        <select name="topic-weight">
            <option value="1" ${weight == 1 ? 'selected' : ''}>1 (Easy - ~1hr)</option>
            <option value="2" ${weight == 2 ? 'selected' : ''}>2 (Medium - ~2hr)</option>
            <option value="3" ${weight == 3 ? 'selected' : ''}>3 (Hard - ~3hr)</option>
        </select>
        <button type="button" class="btn btn-danger" onclick="this.parentNode.remove()"><i class="fas fa-trash-alt"></i></button>
    `;
    list.appendChild(div);
}

function addSlotInput(day = 'Monday', start = '18:00', end = '20:00') {
    // ... (Function implementation remains the same)
    const list = document.getElementById('slots-list');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const div = document.createElement('div');
    div.classList.add('input-row', 'slot-row');
    
    let options = days.map(d => `<option value="${d}" ${d === day ? 'selected' : ''}>${d}</option>`).join('');

    div.innerHTML = `
        <select name="slot-day">${options}</select>
        <input type="time" name="slot-start" value="${start}" required>
        <input type="time" name="slot-end" value="${end}" required>
        <button type="button" class="btn btn-danger" onclick="this.parentNode.remove()"><i class="fas fa-trash-alt"></i></button>
    `;
    list.appendChild(div);
}

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initial defaults for forms
    if (document.getElementById('topics-list').children.length === 0) {
        addTopicInput('Quantum Mechanics Principles', 3);
        addTopicInput('Introduction to C++ Syntax', 1);
    }
    if (document.getElementById('slots-list').children.length === 0) {
        addSlotInput('Monday', '19:00', '21:00');
        addSlotInput('Saturday', '10:00', '13:00');
    }
    
    document.getElementById('current-view-date').valueAsDate = today;
    
    document.getElementById('scheduler-form').addEventListener('submit', handleScheduleGeneration);
    document.getElementById('session-form').addEventListener('submit', handleSessionSave);
    
    // 1. Set up Navigation Event Listeners (NEW)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            switchView(target, link);
        });
    });

    // 2. Initial renders for the default view
    renderPlannerView('day');
    updateStats();
    setupTimer();

    // 3. Add Pomodoro button to nav bar
    const nav = document.querySelector('.nav');
    const timerButton = document.createElement('a');
    timerButton.href = "#";
    timerButton.innerHTML = `<i class="fas fa-clock"></i> Pomodoro`;
    timerButton.onclick = (e) => {
        e.preventDefault();
        openTimerModal();
    };
    nav.appendChild(timerButton);
});

// --- Scheduling Logic (No Change) ---

function handleScheduleGeneration(event) {
    // ... (Function implementation remains the same)
    event.preventDefault();

    const goalDateStr = document.getElementById('goal-date').value;
    if (!goalDateStr) {
        alert("Please set a Goal Deadline.");
        return;
    }
    
    const goalDate = new Date(goalDateStr);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const topicRows = document.querySelectorAll('.topic-row');
    let topics = [];
    let totalWorkloadMinutes = 0;

    if (topicRows.length === 0) {
        alert("Please add at least one topic/task.");
        return;
    }

    topicRows.forEach(row => {
        const name = row.querySelector('input[name="topic-name"]').value;
        const weight = parseInt(row.querySelector('select[name="topic-weight"]').value);
        const estimatedMinutes = weight * 60;
        
        let remainingMinutes = estimatedMinutes;
        let part = 1;

        while (remainingMinutes > 0) {
            const sessionDuration = Math.min(remainingMinutes, 120);
            topics.push({
                name: estimatedMinutes > 120 ? `${name} (Part ${part})` : name,
                originalName: name,
                duration: sessionDuration, 
                difficulty: weight, 
                isReview: false
            });
            remainingMinutes -= sessionDuration;
            totalWorkloadMinutes += sessionDuration;
            part++;
        }
    });

    const slotRows = document.querySelectorAll('.slot-row');
    let slots = [];
    let totalAvailableMinutes = 0;

    if (slotRows.length === 0) {
        alert("Please add at least one available study slot.");
        return;
    }

    slotRows.forEach(row => {
        const day = row.querySelector('select[name="slot-day"]').value;
        const start = row.querySelector('input[name="slot-start"]').value;
        const end = row.querySelector('input[name="slot-end"]').value;
        const duration = calculateDuration(start, end);
        if (duration > 0) {
            slots.push({ day, start, end, duration });
        }
    });

    const diffTime = Math.abs(goalDate - startDate);
    const diffDays = Math.ceil(diffTime / MS_PER_DAY); 
    const scheduleLengthDays = Math.min(diffDays + 1, 14);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < scheduleLengthDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const currentDayName = dayNames[currentDate.getDay()];
        
        slots.filter(s => s.day === currentDayName).forEach(slot => {
             totalAvailableMinutes += slot.duration;
        });
    }

    if (totalWorkloadMinutes > totalAvailableMinutes) {
        alert(`WARNING: Workload (${Math.ceil(totalWorkloadMinutes / 60)} hours) exceeds available time (${Math.floor(totalAvailableMinutes / 60)} hours). The schedule generated will be tight and incomplete!`);
    }

    const finalSchedule = generateConcreteSchedule(startDate, scheduleLengthDays, slots, topics, totalWorkloadMinutes);
    renderGeneratedSchedule(finalSchedule, totalWorkloadMinutes, totalAvailableMinutes);
}

function generateConcreteSchedule(startDate, lengthDays, slots, topics, totalWorkloadMinutes) {
    // ... (Function implementation remains the same)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let schedule = {};
    
    let topicsQueue = topics
        .sort((a, b) => b.difficulty - a.difficulty) 
        .map(t => ({ ...t, remaining: t.duration, isCompleted: false }));
    
    let reviewChecklist = {}; 
    let reviewTimeBudget = totalWorkloadMinutes * 0.2;
    let reviewTimeScheduled = 0;
    
    for (let i = 0; i < lengthDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayName = dayNames[currentDate.getDay()];
        schedule[dateKey] = [];

        const daySlots = slots.filter(s => s.day === dayName).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

        daySlots.forEach(slot => {
            let slotRemaining = slot.duration;
            let currentStartTime = timeToMinutes(slot.start);
            
            while (slotRemaining >= DEFAULT_SESSION_MINUTES) {
                let sessionMinutes = DEFAULT_SESSION_MINUTES; 
                let sessionItem = null;
                
                // 1. PRIORITY: Schedule Hard Topic Review
                if (i >= Math.floor(lengthDays / 2)) {
                    for (const originalName in reviewChecklist) {
                        const completionDate = reviewChecklist[originalName];
                        const daysSinceCompletion = Math.floor((currentDate - completionDate) / MS_PER_DAY);
                        
                        if (daysSinceCompletion >= 2 && daysSinceCompletion <= 4) {
                            sessionItem = {
                                subject: `Review: ${originalName}`,
                                duration: sessionMinutes,
                                isReview: true,
                                priority: 'Crucial'
                            };
                            delete reviewChecklist[originalName];
                            reviewTimeScheduled += sessionMinutes;
                            break;
                        }
                    }
                }

                // 2. NEXT PRIORITY: Remaining Topic Workload
                if (!sessionItem) {
                    let assignedTopicIndex = topicsQueue.findIndex(t => t.remaining > 0);
                    
                    if (assignedTopicIndex !== -1) {
                        const assignedTopic = topicsQueue[assignedTopicIndex];
                        const studyTime = Math.min(sessionMinutes, assignedTopic.remaining);
                        assignedTopic.remaining -= studyTime;
                        
                        sessionItem = {
                            subject: assignedTopic.name,
                            duration: studyTime,
                            isReview: false,
                            priority: assignedTopic.difficulty === 3 ? 'High' : 'Medium'
                        };

                        if (assignedTopic.remaining === 0) {
                            if (assignedTopic.difficulty === 3) {
                                reviewChecklist[assignedTopic.originalName] = new Date(currentDate);
                            }
                            assignedTopic.isCompleted = true; 
                        }
                    } 
                }
                
                // 3. FALLBACK: General Revision
                if (!sessionItem && reviewTimeScheduled < reviewTimeBudget) {
                    sessionItem = {
                        subject: "General Revision & Practice",
                        duration: sessionMinutes,
                        isReview: true,
                        priority: 'Low'
                    };
                    reviewTimeScheduled += sessionMinutes;
                }
                
                if (sessionItem) {
                    const sessionEndMinutes = currentStartTime + sessionItem.duration;
                    schedule[dateKey].push({
                        ...sessionItem,
                        date: dateKey,
                        start: minutesToTime(currentStartTime),
                        end: minutesToTime(sessionEndMinutes),
                        id: Date.now() + Math.random() + i 
                    });
                    
                    currentStartTime = sessionEndMinutes;
                    slotRemaining -= sessionItem.duration;

                } else {
                    break;
                }
            }
        });
    }

    return schedule;
}

function renderGeneratedSchedule(schedule, workload, available) {
    // ... (Function implementation remains the same)
    const outputDiv = document.getElementById('schedule-output');
    const tableDiv = document.getElementById('schedule-result-table');
    tableDiv.innerHTML = '';
    
    let html = `<p>Workload Required: **${Math.ceil(workload / 60)} hours** | Available Slots: **${Math.floor(available / 60)} hours**</p>`;

    let scheduleFound = false;
    for (const dateKey in schedule) {
        if (schedule[dateKey].length > 0) {
            scheduleFound = true;
            const dateObj = new Date(dateKey + 'T00:00:00');
            const headerDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            
            html += `<div class="schedule-day">${headerDate}</div>`;
            
            schedule[dateKey].forEach(item => {
                const reviewClass = item.isReview ? 'review' : '';
                html += `
                    <div class="schedule-item ${reviewClass}">
                        <div>
                            <strong>${item.subject}</strong><br>
                            <span>${item.start} - ${item.end} (${item.duration} min)</span>
                        </div>
                        <button class="btn btn-secondary btn-small" onclick="addGeneratedSession('${item.subject}', '${item.date}', '${item.start}', '${item.end}', '${item.priority}')">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                `;
            });
        }
    }

    if (!scheduleFound) {
        html += `<p style="padding: 10px;">The scheduler could not assign tasks within the available time slots. Please check your deadline, topics, or add more availability.</p>`;
    }

    tableDiv.innerHTML = html;
    outputDiv.classList.remove('hidden');
}


// --- Session Management (No Change) ---

function addGeneratedSession(subject, date, start, end, priority) {
    // ... (Function implementation remains the same)
    const newSession = {
        id: Date.now() + Math.random(),
        subject,
        date,
        start,
        end,
        priority,
        status: 'Scheduled'
    };
    sessions.push(newSession);
    saveSessions();
    alert(`Session added: ${subject} on ${new Date(date).toLocaleDateString()}. Check the Planner View.`);
}

function openSessionModal(session = null) {
    // ... (Function implementation remains the same)
    const modal = document.getElementById('session-modal');
    const form = document.getElementById('session-form');

    if (session) {
        document.getElementById('session-id').value = session.id;
        document.getElementById('session-subject').value = session.subject;
        document.getElementById('session-date').value = session.date;
        document.getElementById('session-start').value = session.start;
        document.getElementById('session-end').value = session.end;
        document.getElementById('session-priority').value = session.priority;
    } else {
        form.reset();
        document.getElementById('session-id').value = '';
        document.getElementById('session-date').valueAsDate = new Date(); 
    }
    modal.style.display = 'block';
}

function closeSessionModal() {
    document.getElementById('session-modal').style.display = 'none';
}

function handleSessionSave(event) {
    // ... (Function implementation remains the same)
    event.preventDefault();
    
    const id = document.getElementById('session-id').value;
    const subject = document.getElementById('session-subject').value;
    const date = document.getElementById('session-date').value;
    const start = document.getElementById('session-start').value;
    const end = document.getElementById('session-end').value;
    const priority = document.getElementById('session-priority').value;

    if (calculateDuration(start, end) <= 0) {
        alert("End time must be after start time.");
        return;
    }

    const newSession = { id: id ? parseFloat(id) : Date.now() + Math.random(), subject, date, start, end, priority, status: 'Scheduled' };

    if (id) {
        const index = sessions.findIndex(s => s.id === parseFloat(id));
        if (index !== -1) {
            sessions[index] = newSession;
        }
    } else {
        sessions.push(newSession);
    }
    
    saveSessions();
    closeSessionModal();
}

function deleteSession(id) {
    // ... (Function implementation remains the same)
    if (confirm("Are you sure you want to delete this study session?")) {
        sessions = sessions.filter(session => session.id !== id);
        saveSessions();
    }
}

function completeSession(id) {
    // ... (Function implementation remains the same)
    const session = sessions.find(s => s.id === id);
    if (session) {
        session.status = session.status === 'Completed' ? 'Scheduled' : 'Completed';
        saveSessions();
    }
}

function renderPlannerView(view = 'day') {
    // ... (Function implementation remains the same)
    const plannerViewDiv = document.getElementById('planner-view');
    
    const currentDate = new Date(document.getElementById('current-view-date').value);
    
    let sessionsToDisplay = [];
    let listHtml = '';

    if (view === 'day') {
        sessionsToDisplay = sessions.filter(s => new Date(s.date + 'T00:00:00').toDateString() === currentDate.toDateString());
        plannerViewDiv.innerHTML = '';
    } else {
        plannerViewDiv.innerHTML = `<p class="hint" style="text-align:center; padding: 20px;">
            Calendar view for **Week/Month** requires a more complex rendering approach. Showing sessions for **${currentDate.toDateString()}** instead.
        </p>`;
        sessionsToDisplay = sessions.filter(s => new Date(s.date + 'T00:00:00').toDateString() === currentDate.toDateString());
    }

    sessionsToDisplay.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    listHtml += `<ul class="session-list">`;
    if (sessionsToDisplay.length === 0) {
        listHtml += `<li style="text-align:center; color: var(--color-text-light); padding: 15px;">No sessions scheduled for this day.</li>`;
    } else {
        sessionsToDisplay.forEach(s => {
            const completedClass = s.status === 'Completed' ? 'completed-session' : '';
            const completeIcon = s.status === 'Completed' ? 'fas fa-check-circle' : 'far fa-circle';
            
            listHtml += `
                <li class="session-item priority-${s.priority} ${completedClass}">
                    <div class="session-info">
                        <div class="session-subject">${s.subject} (${s.priority})</div>
                        <div class="session-time">${s.date} | ${s.start} - ${s.end}</div>
                    </div>
                    <div class="session-actions">
                        <button onclick="completeSession(${s.id})" title="Toggle Complete"><i class="${completeIcon}"></i></button>
                        <button onclick="openSessionModal(sessions.find(item => item.id === ${s.id}))" title="Edit"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteSession(${s.id})" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </li>
            `;
        });
    }
    listHtml += `</ul>`;
    plannerViewDiv.innerHTML += listHtml;
    
    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === view) {
            btn.classList.add('active');
        }
    });
}

// Attach event listeners for view toggling and date change
document.querySelectorAll('.view-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
        renderPlannerView(btn.getAttribute('data-view'));
    });
});
document.getElementById('current-view-date').addEventListener('change', () => {
    const activeView = document.querySelector('.view-toggle button.active')?.getAttribute('data-view') || 'day';
    renderPlannerView(activeView);
});


// --- Statistics & Progress Tracking (No Change) ---

function updateStats() {
    // ... (Function implementation remains the same)
    let totalMinutes = 0;
    let subjectDistribution = {};
    let completionDates = [];

    sessions.filter(s => s.status === 'Completed').forEach(s => {
        totalMinutes += calculateDuration(s.start, s.end);
        completionDates.push(new Date(s.date + 'T00:00:00')); 
        
        const subject = s.subject.split('(')[0].trim();
        subjectDistribution[subject] = (subjectDistribution[subject] || 0) + calculateDuration(s.start, s.end);
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    document.getElementById('total-hours').textContent = `${totalHours}h ${remainingMinutes}m`;

    let streak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    if (completionDates.length > 0) {
        let dates = [...new Set(completionDates.map(d => d.toISOString().split('T')[0]))].map(str => new Date(str)).sort((a, b) => a.getTime() - b.getTime());

        let currentStreak = 0;
        let lastDay = null;

        for (let i = 0; i < dates.length; i++) {
            let currentDay = dates[i];
            
            if (lastDay) {
                const diffDays = Math.floor((currentDay - lastDay) / MS_PER_DAY);
                if (diffDays === 1) {
                    currentStreak++;
                } else if (diffDays > 1) {
                    currentStreak = 1; 
                }
            } else {
                currentStreak = 1;
            }
            lastDay = currentDay;
            
            const diffFromToday = Math.floor((today - currentDay) / MS_PER_DAY);
            if (diffFromToday === 0 || diffFromToday === 1) {
                streak = currentStreak;
            }
        }
        
        if (dates.length > 0 && Math.floor((today - dates[dates.length - 1]) / MS_PER_DAY) > 1) {
             streak = 0;
        }
    }
    document.getElementById('streak').textContent = `${streak} days`;

    const chartDiv = document.getElementById('subject-chart');
    if (Object.keys(subjectDistribution).length > 0) {
        let chartHtml = '<ul>';
        for (const subject in subjectDistribution) {
            const timeInMinutes = subjectDistribution[subject];
            const timeStr = `${Math.floor(timeInMinutes / 60)}h ${timeInMinutes % 60}m`;
            chartHtml += `<li><strong>${subject}:</strong> ${timeStr}</li>`;
        }
        chartHtml += '</ul>';
        chartDiv.innerHTML = chartHtml;
        chartDiv.style.justifyContent = 'flex-start';
        chartDiv.style.alignItems = 'flex-start';
        chartDiv.style.padding = '20px';
    } else {
        chartDiv.innerHTML = '<p>No completed sessions yet to calculate statistics.</p>';
        chartDiv.style.justifyContent = 'center';
        chartDiv.style.alignItems = 'center';
        chartDiv.style.padding = '0';
    }
}


// --- Pomodoro Timer Feature (No Change) ---

let timerInterval;
let isPaused = true;
let currentMode = 'work'; 
let workCount = 0;
let totalSeconds = 25 * 60; 

const modeTimes = {
    'work': 25 * 60,
    'short-break': 5 * 60,
    'long-break': 15 * 60
};

function resetTimerDisplay(mode = 'work') {
    currentMode = mode;
    totalSeconds = modeTimes[mode];
    updateTimerDisplay();
    document.getElementById('timer-status').textContent = mode === 'work' ? 'Ready to focus!' : `Ready for a ${mode.replace('-', ' ')}!`;
    document.getElementById('pause-timer').disabled = true;
    document.getElementById('start-timer').disabled = false;
}

function setupTimer() {
    document.getElementById('start-timer').addEventListener('click', startTimer);
    document.getElementById('pause-timer').addEventListener('click', pauseTimer);
    document.getElementById('reset-timer').addEventListener('click', () => {
        pauseTimer();
        resetTimerDisplay('work');
    });
    resetTimerDisplay('work');
}

function openTimerModal() {
    document.getElementById('timer-modal').style.display = 'block';
}

function closeTimerModal() {
    document.getElementById('timer-modal').style.display = 'none';
    pauseTimer();
}

function updateTimerDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    document.getElementById('timer-display').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
    if (!isPaused) return;
    isPaused = false;
    document.getElementById('start-timer').disabled = true;
    document.getElementById('pause-timer').disabled = false;
    document.getElementById('timer-status').textContent = currentMode === 'work' ? 'FOCUS TIME!' : 'BREAK TIME!';

    timerInterval = setInterval(() => {
        if (totalSeconds > 0) {
            totalSeconds--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isPaused = true;
            notifyUser();
            
            if (currentMode === 'work') {
                workCount++;
                currentMode = (workCount % 4 === 0) ? 'long-break' : 'short-break';
                resetTimerDisplay(currentMode);
                document.getElementById('timer-status').textContent = workCount % 4 === 0 ? 'Long Break Time!' : 'Short Break Time!';
            } else {
                currentMode = 'work';
                resetTimerDisplay('work');
                document.getElementById('timer-status').textContent = 'Break Over. Start Next Session!';
            }
            document.getElementById('start-timer').disabled = false;
        }
    }, 1000);
}

function pauseTimer() {
    if (isPaused) return;
    isPaused = true;
    clearInterval(timerInterval);
    document.getElementById('start-timer').disabled = false;
    document.getElementById('pause-timer').disabled = true;
    document.getElementById('timer-status').textContent = `Paused (${currentMode.replace('-', ' ')} mode)`;
}

function notifyUser() {
    if (Notification.permission === "granted") {
        new Notification("Time's Up!", {
            body: `Your ${currentMode.replace('-', ' ')} session is over.`,
            icon: 'favicon.ico' 
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// Expose functions to the global scope for inline HTML calls
window.switchView = switchView; // Expose the new function
window.openTimerModal = openTimerModal;
window.closeTimerModal = closeTimerModal;
window.addTopicInput = addTopicInput;
window.addSlotInput = addSlotInput;
window.addGeneratedSession = addGeneratedSession;
window.openSessionModal = openSessionModal;
window.closeSessionModal = closeSessionModal;
window.deleteSession = deleteSession;
window.completeSession = completeSession;
window.sessions = sessions;