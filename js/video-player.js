@@
     const fsBtn = safe('fullscreen-btn'); if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
@@
-    // Listener para mudanças de fullscreen
-    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
-        document.addEventListener(event, () => {
-            const container = document.getElementById('video-player-container');
-            if (!container) return;
-            
-            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
-                container.classList.remove('is-fullscreen');
-                container.classList.remove('controls-hidden');
-                controlsVisible = true;
-            }
-            syncFloatingActionsLayout();
-        });
-    });
+    // Listener para mudanças de fullscreen
+    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
+        document.addEventListener(event, () => {
+            const container = document.getElementById('video-player-container');
+            if (!container) return;
+            
+            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
+                container.classList.remove('is-fullscreen');
+                container.classList.remove('controls-hidden');
+                controlsVisible = true;
+            }
+            syncFloatingActionsLayout();
+        });
+    });
+
+    // Age rating overlay control: toca o webm uma vez ao entrar em fullscreen
+    (function(){
+      const container = document.getElementById('video-player-container');
+      const overlay = document.getElementById('age-rating-overlay');
+      if (!container || !overlay) return;
+
+      let shownThisFullscreen = false;
+
+      function showAgeOverlayOnce(){
+        if (shownThisFullscreen) return;
+        shownThisFullscreen = true;
+        try{ overlay.currentTime = 0; }catch(_){ }
+        overlay.style.display = 'block';
+        overlay.classList.add('visible');
+        overlay.play().catch((err)=>{
+          // tentar novamente após pequeno atraso
+          setTimeout(()=>overlay.play().catch(()=>{}), 200);
+        });
+
+        const hide = ()=>{
+          overlay.classList.remove('visible');
+          try{ overlay.pause(); }catch(_){ }
+          overlay.style.display = 'none';
+          try{ overlay.currentTime = 0; }catch(_){ }
+        };
+
+        overlay.removeEventListener('ended', hide);
+        overlay.addEventListener('ended', hide, { once: true });
+        // fallback caso ended não dispare
+        setTimeout(hide, 7000);
+      }
+
+      function onFsChange(){
+        const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
+        const inFs = fsEl === container || container.classList.contains('is-fullscreen');
+        if (inFs){
+          // reset flag e mostrar
+          shownThisFullscreen = false;
+          showAgeOverlayOnce();
+        } else {
+          // saiu do fullscreen -> garantir limpeza
+          shownThisFullscreen = false;
+          overlay.classList.remove('visible');
+          try{ overlay.pause(); }catch(_){ }
+          overlay.style.display = 'none';
+          try{ overlay.currentTime = 0; }catch(_){ }
+        }
+      }
+
+      document.addEventListener('fullscreenchange', onFsChange);
+      document.addEventListener('webkitfullscreenchange', onFsChange);
+      document.addEventListener('msfullscreenchange', onFsChange);
+
+      // exposta API para mudar posição via código se quiser
+      window.setAgeRatingOverlayPosition = function(posClass){
+        overlay.classList.remove('top-left','top-right','bottom-left','bottom-right');
+        if (['top-left','top-right','bottom-left','bottom-right'].includes(posClass)) overlay.classList.add(posClass);
+        else overlay.classList.add('top-left');
+      };
+    })();
@@
     // Update overlay when episode info changes
     window.updateVideoOverlay = updateVideoOverlay;
