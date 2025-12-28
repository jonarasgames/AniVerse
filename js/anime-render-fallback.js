/* fallback: only injects if container empty, non-destructive */
(function(){
  function createCard(a){
    const c = document.createElement('div'); c.className = 'anime-card fallback-card';
    c.innerHTML = `<div style="height:120px;background-image:url('${a.cover||a.thumbnail||'images/bg-default.jpg'}');background-size:cover;border-radius:6px;"></div><h4>${a.title||a.name||a.id}</h4>`;
    return c;
  }
  function findTargets(){ 
    const cand = ['#animes-grid','#new-releases-grid','#full-catalog-grid','#movies-grid','#ovas-grid','#catalog-grid','.animes-grid','#anime-list']; 
    const targets = [];
    for(const s of cand){ 
      const el=document.querySelector(s); 
      if(el) targets.push(el); 
    } 
    return targets; 
  }
  function render(){ 
    try{ 
      if(!window.animeDB || !Array.isArray(window.animeDB.animes) || window.animeDB.animes.length===0) return; 
      const targets = findTargets(); 
      if(targets.length === 0) return;
      
      targets.forEach(t => {
        // Only inject if the grid is empty
        if(t.querySelector('.anime-card') || t.childElementCount>0) return;
        
        const wrap=document.createElement('div'); 
        wrap.className='fallback-grid'; 
        wrap.style.display='grid'; 
        wrap.style.gridTemplateColumns='repeat(auto-fill,minmax(180px,1fr))'; 
        wrap.style.gap='12px'; 
        
        // Get appropriate animes based on grid type
        let animes = [];
        if (t.id === 'movies-grid') {
          animes = window.animeDB.getAnimesByType('movie');
        } else if (t.id === 'ovas-grid') {
          animes = window.animeDB.getAnimesByType('ova');
        } else if (t.id === 'new-releases-grid') {
          animes = window.animeDB.getNewReleases(12);
        } else {
          animes = window.animeDB.animes;
        }
        
        animes.slice(0,24).forEach(a=>wrap.appendChild(createCard(a))); 
        t.appendChild(wrap); 
        console.info(`fallback-inserted into ${t.id}`);
      });
    }catch(e){console.warn(e);} 
  }
  window.addEventListener('animeDataLoaded', ()=> setTimeout(render,50), { once:true });
  setTimeout(render,300);
})();
