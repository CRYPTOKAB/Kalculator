// static/main.js

const $expr = document.getElementById("expr"); 
const $result = document.getElementById("result"); 
const $equals = document.getElementById("equals"); 
const API = "/api/calc"; 

function insertText(txt) { 
    const start = $expr.selectionStart; 
    const end = $expr.selectionEnd; 
    const before = $expr.value.slice(0, start); 
    const after  = $expr.value.slice(end); 

    // Logic for implicit multiplication: 
    // If inserting a function (like sin() ) or a constant (like pi) right after a number or constant, insert a '*'
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
    // Data-func buttons (like sin, cos) are expected to insert "sin(" or "cos("
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

        // Check for non-200 status codes (e.g., 400, 500) from the server
        if (!res.ok) {
            try {
                const data = await res.json();
                $result.textContent = "Error: " + (data.error || "Server error (" + res.status + ")");
            } catch (e) {
                // Better error message for network failure (especially on GitHub Pages)
                $result.textContent = "HTTP Error: " + res.status + " (Is the Python server running?)";
            }
            return;
        }

        const data = await res.json(); 
        
        if (data.ok) { 
            $result.textContent = "= " + data.result; 
        } else { 
            // Handle errors returned within the 200 OK response (from Python logic)
            $result.textContent = "Error: " + (data.error || "Invalid expression"); 
        } 

    } catch (e) { 
        // This block now gives a helpful message for true network failures
        console.error("Fetch failed (Network error):", e);
        $result.textContent = "Network error (Is the Python server running?)"; 
    } 
} 

// --- Event Listeners ---

// NEW FIX: Prevent buttons from stealing focus on mousedown/click
document.querySelectorAll(".keys button").forEach(btn => {
    btn.addEventListener("mousedown", (e) => {
        // This stops the button from receiving focus when clicked
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

// Keyboard: Enter = calculate
$expr.addEventListener("keydown", (e) => { 
    if (e.key === "Enter") { 
        e.preventDefault(); 
        calculate(); 
    } 
}); 

// Live preview (debounced)
$expr.addEventListener("input", () => { 
    clearTimeout($expr._t); 
    $expr._t = setTimeout(calculate, 250); 
}); 

// Initial focus 
$expr.focus();