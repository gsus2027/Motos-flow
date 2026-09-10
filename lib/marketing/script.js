(function(){
  var PHONE = "50769092074";
  function waLink(text){
    return "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text);
  }
  var MSG = {
    en: "Hi Flow Rentals! I'd like to book a rental.",
    es: "¡Hola Flow Rentals! Quisiera reservar un alquiler."
  };
  function itemMsg(lang, item){
    return lang === 'es'
      ? "¡Hola Flow Rentals! Quisiera preguntar por el alquiler de: " + item
      : "Hi Flow Rentals! I'd like to ask about renting: " + item;
  }

  function currentLang(){
    return document.documentElement.classList.contains('lang-es') ? 'es' : 'en';
  }

  function refreshWaLinks(){
    var lang = currentLang();
    var generic = ['waNav','waHero','waCta','waLoc'];
    generic.forEach(function(id){
      var el = document.getElementById(id);
      if(el){ el.href = waLink(MSG[lang]); }
    });
    var footEl = document.getElementById('waFoot');
    if(footEl){
      var a = footEl.querySelector('a');
      if(a){ a.href = waLink(MSG[lang]); }
    }
    document.querySelectorAll('[data-wa-item]').forEach(function(el){
      el.href = waLink(itemMsg(lang, el.getAttribute('data-wa-item')));
    });
  }

  function setLang(lang){
    var html = document.documentElement;
    if(lang === 'es'){ html.classList.add('lang-es'); } else { html.classList.remove('lang-es'); }
    html.setAttribute('lang', lang);
    try{ localStorage.setItem('flowRentalsLang', lang); }catch(e){}
    refreshWaLinks();
  }

  function toggleLang(){ setLang(currentLang() === 'es' ? 'en' : 'es'); }

  var t1 = document.getElementById('langToggle');
  var t2 = document.getElementById('langToggleFoot');
  if(t1){ t1.addEventListener('click', toggleLang); }
  if(t2){ t2.addEventListener('click', toggleLang); }

  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  var navToggleIcon = document.getElementById('navToggleIcon');
  var MENU_ICON = '<path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  var CLOSE_ICON = '<path d="M5 5l12 12M17 5L5 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  function setMenuOpen(open){
    if(!navToggle || !mobileMenu) return;
    mobileMenu.hidden = !open;
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if(navToggleIcon){ navToggleIcon.innerHTML = open ? CLOSE_ICON : MENU_ICON; }
  }
  if(navToggle && mobileMenu){
    navToggle.addEventListener('click', function(){
      setMenuOpen(mobileMenu.hidden);
    });
    mobileMenu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ setMenuOpen(false); });
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){ setMenuOpen(false); }
    });
    document.addEventListener('click', function(e){
      if(!mobileMenu.hidden && !mobileMenu.contains(e.target) && !navToggle.contains(e.target)){
        setMenuOpen(false);
      }
    });
  }

  var initial = 'en';
  try{
    var saved = localStorage.getItem('flowRentalsLang');
    if(saved === 'en' || saved === 'es'){ initial = saved; }
  }catch(e){}
  setLang(initial);
})();