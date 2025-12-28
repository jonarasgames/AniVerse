/* fallback: only injects if container empty, non-destructive */
(function(){
  function createCard(a){
    const c = document.createElement('div'); c.className = 'anime-card fallback-card';
    c.innerHTML = `<div style="height:120px;background-image:url('${a.cover||'images/bg-default.jpg'}');background-size:cover;border-radius:6px;"></div><h4>${a.title||a.name||a.id}</h4>`;
    return c;
  }
  function findTarget(){ const cand = ['#animes-grid','#catalog-grid','.animes-grid','#anime-list']; for(const s of cand){ const el=document.querySelector(s); if(el) return el; } return null; }
  function render(){ try{ if(!window.animeDB || !Array.isArray(window.animeDB.animes) || window.animeDB.animes.length===0) return; const t=findTarget(); if(!t) return; if(t.querySelector('.anime-card') || t.childElementCount>0) return; const wrap=document.createElement('div'); wrap.className='fallback-grid'; wrap.style.display='grid'; wrap.style.gridTemplateColumns='repeat(auto-fill,minmax(180px,1fr))'; wrap.style.gap='12px'; window.animeDB.animes.slice(0,24).forEach(a=>wrap.appendChild(createCard(a))); t.appendChild(wrap); console.info('fallback-inserted'); }catch(e){console.warn(e);} }
  window.addEventListener('animeDataLoaded', ()=> setTimeout(render,50), { once:true });
  setTimeout(render,300);
})();
