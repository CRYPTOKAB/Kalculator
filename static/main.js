// static/main.js - FIXES JS EXECUTION ERRORS AND FOCUS PROBLEMS

document.addEventListener("DOMContentLoaded", () => {
    // Select elements after the DOM is guaranteed to be loaded
    const $expr = document.getElementById("expr"); 
    const $result = document.getElementById("result"); 
    const $equals = document.getElementById("equals"); 
    const API = "/api/calc"; 

    // --- Core Calculator Logic Functions ---

    function insertText(txt) { 
        const start = $expr.selectionStart; 
        const end = $expr.selectionEnd; 
        const before = $expr.value.slice(0, start); 
        const after  = $expr.value.slice(end); 

        // Logic for implicit multiplication
        const lastChar = start > 0 ? $expr.value.slice(start - 1, start) : '';
        const isMultiplicative = txt.endsWith("(") || txt === 'pi' || txt === 'e';
        if (isMultiplicative && lastChar.match(/[\d\.a-zA-Z\)]/)) {
            txt = "*" + txt;
        }

        $expr.value = before + txt + after; 
        const caret = start + txt.length; 
        $expr.focus(); 
        $expr.setSelectionRange(caret, caret); 
    } 

    function wrapIfFunc(token) { 
        return token;
    } 

    function delChar() { 
        const start = $expr.selectionStart; 
        const end = $expr.selectionEnd; 

        if (start !== end) { 
            // Delete selection
            const before = $expr.value.slice(0, start); 
            const after  = $expr.value.slice(end); 
            $expr.value = before + after; 
            $expr.setSelectionRange(start, start); 
        } else if (start > 0) { 
            // Delete single character before caret
            const before = $expr.value.slice(0, start - 1); 
            const after  = $expr.value.slice(start); 
            $expr.value = before + after; 
            $expr.setSelectionRange(start - 1, start - 1); 
        } 
        $expr.focus(); 
    } 

    async function calculate() { 
        const expr = $expr.value.trim(); 
        if (!expr) { $result.textContent = "= 0"; return; } 

        try { 
            const res = await fetch(API, { 
                method: "POST", 
                headers: {"Content-Type": "application/json"}, 
                body: JSON.stringify({ expr }) 
            }); 

            // Handle errors for the calculation API
            if (!res.ok) {
                try {
                    const data = await res.json();
                    $result.textContent = "Error: " + (data.error || "Server error (" + res.status + ")");
                } catch (e) {
                    $result.textContent = "HTTP Error: " + res.status + " (Is the Python server running?)";
                }
                return;
            }

            const data = await res.json(); 
            
            if (data.ok) { 
                $result.textContent = "= " + data.result; 
            } else { 
                $result.textContent = "Error: " + (data.error || "Invalid expression"); 
            } 

        } catch (e) { 
            console.error("Fetch failed (Network error):", e);
            $result.textContent = "Network error (Is the Python server running?)"; 
        } 
    } 

    // --- Event Listeners ---

    // FIX: Prevents the button click from stealing focus from the input field
    document.querySelectorAll(".keys button").forEach(btn => {
        btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });
    });

    // Insert buttons
    document.querySelectorAll("button[data-insert]").forEach(btn => { 
        btn.addEventListener("click", () => insertText(btn.getAttribute("data-insert"))); 
    }); 

    // Function buttons
    document.querySelectorAll("button[data-func]").forEach(btn => { 
        btn.addEventListener("click", () => insertText(wrapIfFunc(btn.getAttribute("data-func")))); 
    }); 

    // Clear
    document.querySelector("button[data-action='clear']").addEventListener("click", () => { 
        $expr.value = ""; 
        $result.textContent = "= 0"; 
        $expr.focus(); 
    }); 

    // Delete
    document.querySelector("button[data-action='del']").addEventListener("click", delChar); 

    // Equals
    $equals.addEventListener("click", calculate); 

    // Keyboard and live preview listeners
    $expr.addEventListener("keydown", (e) => { 
        if (e.key === "Enter") { 
            e.preventDefault(); 
            calculate(); 
        } 
    }); 

    $expr.addEventListener("input", () => { 
        clearTimeout($expr._t); 
        $expr._t = setTimeout(calculate, 250); 
    }); 

    // Initial focus 
    $expr.focus();
});
