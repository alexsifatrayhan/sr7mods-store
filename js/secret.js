/**
 * SR7MODS STORE - Encrypted Backdoor Systems
 * Implements the invisible gear trigger, 7-tap blank overlay, and Base64 authentications
 */

(function () {
  // Wait for DOM to load
  document.addEventListener('DOMContentLoaded', () => {
    initBackdoor();
  });

  function initBackdoor() {
    // Look for footer or append a hidden gear to the page
    const footer = document.querySelector('footer');
    if (!footer) return;

    // Create the secret gear icon if it doesn't already exist
    let gear = document.getElementById('secret-trigger-gear');
    if (!gear) {
      gear = document.createElement('button');
      gear.id = 'secret-trigger-gear';
      gear.className = 'secret-gear';
      gear.innerHTML = '⚙️';
      gear.title = 'Admin Configuration Matrix';
      footer.appendChild(gear);
    }

    // Attach click handler to start the secret authorization phase
    gear.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      activateBlankScreen();
    });
  }

  function activateBlankScreen() {
    // Create complete pitch black screen
    const blankOverlay = document.createElement('div');
    blankOverlay.id = 'cyber-blank-screen';
    blankOverlay.style.position = 'fixed';
    blankOverlay.style.top = '0';
    blankOverlay.style.left = '0';
    blankOverlay.style.width = '100vw';
    blankOverlay.style.height = '100vh';
    blankOverlay.style.backgroundColor = '#000000';
    blankOverlay.style.zIndex = '99999';
    blankOverlay.style.cursor = 'crosshair';
    blankOverlay.style.display = 'flex';
    blankOverlay.style.flexDirection = 'column';
    blankOverlay.style.alignItems = 'center';
    blankOverlay.style.justifyContent = 'center';
    blankOverlay.style.userSelect = 'none';

    // Add a very subtle glitch line in center
    const scanline = document.createElement('div');
    scanline.style.width = '100%';
    scanline.style.height = '1px';
    scanline.style.background = 'rgba(255, 255, 255, 0.015)';
    scanline.style.boxShadow = '0 0 4px rgba(255, 255, 255, 0.01)';
    blankOverlay.appendChild(scanline);

    document.body.appendChild(blankOverlay);

    // Disable scrolling while on blank screen
    document.body.style.overflow = 'hidden';

    let tapCount = 0;
    let lastTapTime = Date.now();

    // 7 taps listener
    blankOverlay.addEventListener('click', (e) => {
      const currentTime = Date.now();
      // If it's been more than 4 seconds since last tap, reset count
      if (currentTime - lastTapTime > 4000) {
        tapCount = 0;
      }
      lastTapTime = currentTime;
      tapCount++;

      // Minimal sound click feedback or subtle ripple if desired
      createClickRipple(e.clientX, e.clientY, blankOverlay);

      if (tapCount === 7) {
        // Trigger Translucent Password prompt
        showSecureAuthModal(blankOverlay);
        tapCount = 0; // reset
      }
    });
  }

  function createClickRipple(x, y, parent) {
    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.left = `${x - 10}px`;
    ripple.style.top = `${y - 10}px`;
    ripple.style.width = '20px';
    ripple.style.height = '20px';
    ripple.style.border = '1px solid rgba(0, 242, 254, 0.15)';
    ripple.style.borderRadius = '50%';
    ripple.style.pointerEvents = 'none';
    ripple.style.transform = 'scale(0.5)';
    ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
    ripple.style.opacity = '1';

    parent.appendChild(ripple);

    setTimeout(() => {
      ripple.style.transform = 'scale(3)';
      ripple.style.opacity = '0';
    }, 10);

    setTimeout(() => {
      ripple.remove();
    }, 500);
  }

  function showSecureAuthModal(parent) {
    // Create custom glassmorphic overlay prompt
    const modalContainer = document.createElement('div');
    modalContainer.id = 'auth-glass-modal';
    modalContainer.className = 'glass-panel animate-fade-in';
    modalContainer.style.width = '90%';
    modalContainer.style.maxWidth = '400px';
    modalContainer.style.padding = '24px';
    modalContainer.style.borderRadius = '12px';
    modalContainer.style.border = '1px solid rgba(0, 242, 254, 0.3)';
    modalContainer.style.boxShadow = '0 0 30px rgba(0, 242, 254, 0.2)';
    modalContainer.style.textAlign = 'center';
    modalContainer.style.position = 'relative';

    modalContainer.innerHTML = `
      <div class="mb-4">
        <h2 class="font-display text-2xl font-bold tracking-wider text-cyan-400 text-cyber-glow-cyan uppercase mb-1">SECURE TERMINAL BYPASS</h2>
        <p class="text-xs text-gray-400 font-mono">AUTHORIZED PERSONNEL ONLY - LEVEL 5 CLEARANCE</p>
      </div>
      <div class="mb-4">
        <input type="password" id="cyber-pass-input" placeholder="ENTER ACCESS CODE..." 
          class="w-full text-center py-2 px-3 bg-black/80 border border-cyan-500/40 rounded text-cyan-300 font-mono tracking-widest focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,242,254,0.3)] transition-all">
        <div id="auth-error-msg" class="text-rose-500 text-xs font-mono mt-2 hidden">INVALID AUTHORIZATION HASH</div>
      </div>
      <div class="flex gap-3 justify-center">
        <button id="auth-cancel-btn" class="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-xs text-gray-400 hover:text-white uppercase font-mono rounded transition-all">ABORT</button>
        <button id="auth-submit-btn" class="px-6 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-xs text-cyan-300 hover:text-cyan-200 uppercase font-mono rounded shadow-[0_0_8px_rgba(0,242,254,0.2)] hover:shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all">EXECUTE</button>
      </div>
    `;

    parent.appendChild(modalContainer);

    const input = modalContainer.querySelector('#cyber-pass-input');
    const submitBtn = modalContainer.querySelector('#auth-submit-btn');
    const cancelBtn = modalContainer.querySelector('#auth-cancel-btn');
    const errorMsg = modalContainer.querySelector('#auth-error-msg');

    input.focus();

    // Base64 target: "dXBkYXRlQHN0b3Jl" => "update@store"
    const encryptedPass = 'dXBkYXRlQHN0b3Jl';

    function handleVerify() {
      const value = input.value;
      if (btoa(value) === encryptedPass) {
        // Correct Password! Set Session token & redirect to control.html
        localStorage.setItem('sr7_admin_session', 'authenticated_token_99812_sr7mods');
        errorMsg.classList.add('hidden');
        input.style.borderColor = '#39ff14';
        input.style.color = '#39ff14';
        submitBtn.style.background = 'rgba(57, 255, 20, 0.2)';
        submitBtn.style.color = '#39ff14';
        submitBtn.innerText = 'ACCESS GRANTED';

        setTimeout(() => {
          window.location.href = 'control.html';
        }, 800);
      } else {
        // Wrong password - Wipe session, trigger lockdown and home redirect
        errorMsg.classList.remove('hidden');
        input.style.borderColor = '#ff007f';
        input.classList.add('animate-bounce');
        localStorage.removeItem('sr7_admin_session');

        setTimeout(() => {
          alert('ACCESS DENIED - SYSTEM SHUTDOWN TRIGGERED');
          // Clean up blank screen
          parent.remove();
          document.body.style.overflow = 'auto';
          window.location.href = 'index.html';
        }, 1200);
      }
    }

    submitBtn.addEventListener('click', handleVerify);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleVerify();
      }
    });

    cancelBtn.addEventListener('click', () => {
      parent.remove();
      document.body.style.overflow = 'auto';
    });
  }
})();
