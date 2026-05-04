document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const slideNumberDisplay = document.getElementById('slide-number');
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const indexList = document.getElementById('index-list');
    const indexJumpItems = document.querySelectorAll('[data-jump]');

    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const pointerCanvas = document.getElementById('pointer-canvas');
    const pCtx = pointerCanvas.getContext('2d');
    
    const penBtn = document.getElementById('pen-btn');
    const laserBtn = document.getElementById('laser-btn');
    const clearBtn = document.getElementById('clear-btn');
    const colorPicker = document.getElementById('pen-color-picker');
    const colorDots = document.querySelectorAll('.color-dot');

    let currentSlide = 0;
    let isDrawing = false;
    let drawingActive = false;
    let laserActive = false;
    let penColor = '#4CC9F0';
    
    // Laser Trail Logic
    let trail = [];
    const TRAIL_LIFETIME = 500; // ms

    // --- Sidebar Index Generation ---
    function generateIndex() {
        indexList.innerHTML = '';
        slides.forEach((slide, index) => {
            const title = slide.querySelector('.slide-title')?.textContent || 
                         slide.querySelector('h1')?.textContent || `Slide ${index + 1}`;
            
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${title}`;
            li.addEventListener('click', () => {
                goToSlide(index);
                toggleSidebar(false);
            });
            indexList.appendChild(li);
        });
    }

    function updateIndexActiveState() {
        const items = indexList.querySelectorAll('li');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === currentSlide);
        });
    }

    // --- Slide Navigation ---
    function updateSlides() {
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === currentSlide);
        });
        slideNumberDisplay.textContent = `${currentSlide + 1} / ${slides.length}`;
        updateIndexActiveState();
        
        // Reset animations on new slide
        const activeSlide = slides[currentSlide];
        const animElements = activeSlide.querySelectorAll('[class*="animate-"]');
        animElements.forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; // trigger reflow
            el.style.animation = null;
        });
    }

    function goToSlide(index) {
        if (index >= 0 && index < slides.length) {
            currentSlide = index;
            updateSlides();
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlides();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            updateSlides();
        }
    });

    // Jump from Index Slide
    indexJumpItems.forEach(item => {
        item.addEventListener('click', () => {
            const slideIdx = parseInt(item.getAttribute('data-jump'));
            goToSlide(slideIdx);
        });
    });

    // --- Sidebar Controls ---
    function toggleSidebar(state) {
        sidebar.classList.toggle('open', state);
    }

    menuBtn.addEventListener('click', () => toggleSidebar(true));
    closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));

    // --- Drawing & Laser System ---
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        pointerCanvas.width = window.innerWidth;
        pointerCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Toggle Pen
    penBtn.addEventListener('click', () => {
        drawingActive = !drawingActive;
        laserActive = false;
        updateToolStates();
    });

    // Toggle Laser
    laserBtn.addEventListener('click', () => {
        laserActive = !laserActive;
        drawingActive = false;
        updateToolStates();
    });

    function updateToolStates() {
        canvas.classList.toggle('active', drawingActive);
        penBtn.classList.toggle('active', drawingActive);
        pointerCanvas.classList.toggle('active', laserActive);
        laserBtn.classList.toggle('active', laserActive);
        
        // Mostrar selector si cualquiera de las dos herramientas está activa
        colorPicker.classList.toggle('hidden', !drawingActive && !laserActive);
    }

    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            penColor = dot.getAttribute('data-color');
        });
    });

    // --- Drawing Handlers ---
    function startDrawing(e) {
        if (!drawingActive) return;
        isDrawing = true;
        draw(e);
    }

    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath();
    }

    function draw(e) {
        if (!isDrawing || !drawingActive) return;

        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const y = e.clientY || (e.touches && e.touches[0].clientY);

        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = penColor;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    // --- Laser Trail Loop ---
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 77, b: 109 };
    }

    function animateLaser() {
        pCtx.clearRect(0, 0, pointerCanvas.width, pointerCanvas.height);
        const now = Date.now();
        const rgb = hexToRgb(penColor);
        
        trail = trail.filter(p => now - p.t < TRAIL_LIFETIME);
        
        if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
                const p1 = trail[i-1];
                const p2 = trail[i];
                const age = now - p2.t;
                const opacity = 1 - (age / TRAIL_LIFETIME);
                
                pCtx.beginPath();
                pCtx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
                pCtx.lineWidth = 8 * opacity;
                pCtx.lineCap = 'round';
                pCtx.moveTo(p1.x, p1.y);
                pCtx.lineTo(p2.x, p2.y);
                pCtx.stroke();
            }
            
            const head = trail[trail.length - 1];
            pCtx.beginPath();
            pCtx.fillStyle = penColor;
            pCtx.arc(head.x, head.y, 6, 0, Math.PI * 2);
            pCtx.fill();
            pCtx.shadowBlur = 15;
            pCtx.shadowColor = penColor;
            pCtx.stroke();
            pCtx.shadowBlur = 0;
        }
        
        requestAnimationFrame(animateLaser);
    }
    animateLaser();

    function updateLaserPos(e) {
        if (!laserActive) return;
        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const y = e.clientY || (e.touches && e.touches[0].clientY);
        trail.push({ x, y, t: Date.now() });
    }

    // Event Listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    pointerCanvas.addEventListener('mousemove', updateLaserPos);
    pointerCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        updateLaserPos(e);
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    canvas.addEventListener('touchend', stopDrawing);

    // --- Cronograma Data (Injected for offline/local support) ---
    const CRONOGRAMA_DATA = {
        "unidades": [
            {
                "nombre": "Unidad 1",
                "color": "#4f46e5",
                "temas": [
                    { "nombre": "T1: Integración por partes", "modalidad": "Mixto", "leccion": { "inicio": "11/05/2026", "fin": "04/06/2026" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T2: Integración trigonométrica", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T3: Sustitución trigonométrica", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T4: Integración usando descomposición en fracciones parciales", "modalidad": "Mixto", "leccion": { "inicio": "20/05/2026", "fin": "04/06/2026" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T5: Integración de funciones racionales de senos y cosenos", "modalidad": "Virtual", "leccion": { "inicio": "15/05/2026", "fin": "22/05/2026" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T6: Cálculo de volúmenes de sólidos de revolución", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T7: Integrales impropias", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T8: Planos, cilindros y superficies cuádricas", "modalidad": "Mixto", "leccion": { "inicio": "21/05/2026", "fin": "27/05/2026" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T9: Funciones de varias variables", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T10: Límites y continuidad de funciones", "modalidad": "Virtual", "leccion": { "inicio": "28/05/2026", "fin": "04/06/2026" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } },
                    { "nombre": "T11: Derivadas parciales", "modalidad": "Virtual", "leccion": { "inicio": "28/05/2026", "fin": "02/06/2026" }, "actividad": { "inicio": "11/05/2026", "fin": "04/06/2026" } }
                ]
            },
            {
                "nombre": "Unidad 2",
                "color": "#10b981",
                "temas": [
                    { "nombre": "T1: Regla de la cadena, derivación implícita", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T2: Derivada direccional y vector gradiente", "modalidad": "Mixto", "leccion": { "inicio": "05/06/2026", "fin": "11/06/2026" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T3: Plano tangente a una superficie", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T4: Valores extremos y optimización", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T5: Integrales dobles rectangulares", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T6: Integrales dobles regiones generales", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T7: Integrales dobles polares", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T8: Cálculo de áreas y volúmenes", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T9: Integrales triples rectangulares", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } },
                    { "nombre": "T10: Integrales triples cilíndricas y esféricas", "modalidad": "Virtual", "leccion": { "inicio": "01/07/2026", "fin": "05/07/2026" }, "actividad": { "inicio": "05/06/2026", "fin": "02/07/2026" } }
                ]
            },
            {
                "nombre": "Unidad 3",
                "color": "#f59e0b",
                "temas": [
                    { "nombre": "T1: Sucesiones", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } },
                    { "nombre": "T2: Series infinitas", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } },
                    { "nombre": "T3: Criterio de la integral", "modalidad": "Virtual", "leccion": { "inicio": "08/07/2026", "fin": "12/07/2026" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } },
                    { "nombre": "T4: Criterio de comparación", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } },
                    { "nombre": "T5: Criterio de la razón y raíz", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } },
                    { "nombre": "T6: Series alternantes", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } },
                    { "nombre": "T7: Series de potencia", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } },
                    { "nombre": "T8: Series de Taylor", "modalidad": "Presencial", "leccion": { "inicio": "", "fin": "" }, "actividad": { "inicio": "03/07/2026", "fin": "30/07/2026" } }
                ]
            }
        ]
    };

    function loadCronograma() {
        const cronogramaBody = document.getElementById('cronograma-body');
        if (!cronogramaBody) return;
        
        cronogramaBody.innerHTML = '';
        
        CRONOGRAMA_DATA.unidades.forEach(unidad => {
            unidad.temas.forEach((tema, idx) => {
                const tr = document.createElement('tr');
                const tdUnidad = idx === 0 ? `<td rowspan="${unidad.temas.length}" style="background: ${unidad.color}22; font-weight: 800; color: ${unidad.color}">${unidad.nombre}</td>` : '';
                const modClass = `tag-${tema.modalidad.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
                
                tr.innerHTML = `
                    ${tdUnidad}
                    <td>${tema.nombre}</td>
                    <td><span class="modalidad-tag ${modClass}">${tema.modalidad}</span></td>
                    <td>${tema.leccion.inicio ? `${tema.leccion.inicio} - ${tema.leccion.fin}` : '<span style="opacity:0.3">—</span>'}</td>
                    <td class="highlight">${tema.actividad.inicio} - ${tema.actividad.fin}</td>
                `;
                cronogramaBody.appendChild(tr);
            });
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
            if (currentSlide < slides.length - 1) {
                currentSlide++;
                updateSlides();
            }
        } else if (e.key === 'ArrowLeft') {
            if (currentSlide > 0) {
                currentSlide--;
                updateSlides();
            }
        } else if (e.key === 'p' || e.key === 'P') {
            penBtn.click();
        } else if (e.key === 'l' || e.key === 'L') {
            laserBtn.click();
        } else if (e.key === 'c' || e.key === 'C') {
            clearBtn.click();
        } else if (e.key === 'm' || e.key === 'M') {
            menuBtn.click();
        } else if (e.key === 'Escape') {
            toggleSidebar(false);
        }
    });

    // --- Auto-hide Controls ---
    const controls = document.getElementById('controls');
    let controlTimeout;

    function resetControlTimeout() {
        controls.classList.remove('inactive');
        clearTimeout(controlTimeout);
        controlTimeout = setTimeout(() => {
            if (!sidebar.classList.contains('open')) {
                controls.classList.add('inactive');
            }
        }, 3000);
    }

    document.addEventListener('mousemove', resetControlTimeout);
    document.addEventListener('click', resetControlTimeout);
    document.addEventListener('keydown', resetControlTimeout);
    resetControlTimeout();

    // Init
    generateIndex();
    loadCronograma();
    updateSlides();

    // --- Telegram WebApp Integration ---
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand(); // Expande la app a pantalla completa en Telegram
    }
});
