    function toggleSidebar() {
    const s = document.getElementById('sidebar');
    const o = document.getElementById('overlay');
    const isOpen = s.classList.contains('open');
    if (isOpen) {
      s.classList.remove('open');
      o.classList.remove('active');
    } else {
      s.classList.add('open');
      o.classList.add('active');
    }
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
  }