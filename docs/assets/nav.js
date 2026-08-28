// 사이드바 네비게이션 — 모든 문서 페이지가 공유한다. 각 페이지는 이 스크립트를 로드하기 전에
// `window.DOCS_BASE`를 정의해야 한다: 루트(index.html)는 '', 서브페이지(components/*, tokens/*)는 '../'.
// 링크 href는 이 파일 안에서 DOCS_BASE를 붙여 조립하므로 트리 구조는 여기 한 곳만 고치면 된다.

(function () {
  var BASE = window.DOCS_BASE || '';

  var NAV = [
    {
      standalone: true,
      icon: 'home',
      label: '소개',
      href: BASE + 'index.html',
    },
    {
      icon: 'grid',
      label: '토큰',
      href: BASE + 'tokens/colors.html',
      children: [
        { label: '색상', href: BASE + 'tokens/colors.html' },
        { label: '간격 & Radius', href: BASE + 'tokens/spacing.html' },
        { label: '타이포그래피', href: BASE + 'tokens/typography.html' },
      ],
    },
    {
      icon: 'layout',
      label: '기본 컴포넌트',
      href: BASE + 'components/button.html',
      children: [
        { label: 'Button', href: BASE + 'components/button.html' },
        { label: 'Icon Button', href: BASE + 'components/icon-button.html' },
        { label: 'Social Button', href: BASE + 'components/social-button.html' },
        { label: 'Chip', href: BASE + 'components/chip.html' },
        { label: 'Con', href: BASE + 'components/con.html' },
        { label: 'Tabs', href: BASE + 'components/tabs.html' },
      ],
    },
    {
      icon: 'edit',
      label: '폼 컴포넌트',
      href: BASE + 'components/input.html',
      children: [
        { label: 'Input', href: BASE + 'components/input.html' },
        { label: 'Textarea', href: BASE + 'components/textarea.html' },
        { label: 'Checkbox & Radio & Toggle', href: BASE + 'components/checkbox-radio.html' },
        { label: 'Dropdown & Select', href: BASE + 'components/dropdown-select.html' },
        { label: 'Upload', href: BASE + 'components/upload.html' },
      ],
    },
    {
      icon: 'bell',
      label: '피드백 컴포넌트',
      href: BASE + 'components/alert.html',
      children: [
        { label: 'Alert', href: BASE + 'components/alert.html' },
        { label: 'Modal', href: BASE + 'components/modal.html' },
        { label: 'Tooltip & Help Icon', href: BASE + 'components/tooltip.html' },
        { label: 'Progress Bar', href: BASE + 'components/progress-bar.html' },
        { label: 'Featured Icon', href: BASE + 'components/featured-icon.html' },
      ],
    },
    {
      icon: 'bar-chart',
      label: '데이터 컴포넌트',
      href: BASE + 'components/table.html',
      children: [
        { label: 'Table', href: BASE + 'components/table.html' },
        { label: 'Board', href: BASE + 'components/board.html' },
        { label: 'Calendar', href: BASE + 'components/calendar.html' },
        { label: 'Card', href: BASE + 'components/card.html' },
        { label: 'Avatar Group', href: BASE + 'components/avatar-group.html' },
        { label: 'Pagination', href: BASE + 'components/pagination.html' },
      ],
    },
    {
      icon: 'menu',
      label: '네비게이션 컴포넌트',
      href: BASE + 'components/side-nav-item.html',
      children: [
        { label: 'Side Nav Item', href: BASE + 'components/side-nav-item.html' },
        { label: 'Scrollbar', href: BASE + 'components/scrollbar.html' },
        { label: 'Header', href: BASE + 'components/header.html' },
        { label: 'Logo', href: BASE + 'components/logo.html' },
        { label: 'Login Header', href: BASE + 'components/login-header.html' },
      ],
    },
  ];

  function iconSvg(name) {
    return (
      '<svg class="side-nav-item__icon"><use href="' +
      BASE +
      'assets/icons/sprite.svg#icon-base-' +
      name +
      '"></use></svg>'
    );
  }

  function itemHtml(item, isChild) {
    var classes = 'side-nav-item side-nav-item-light' + (isChild ? ' side-nav-item-sub' : '');
    var content = isChild
      ? item.label
      : '<span class="side-nav-item__content">' + iconSvg(item.icon) + '<span class="side-nav-item__label">' + item.label + '</span></span>';
    var attrs = isChild ? ' data-nav-child' : '';
    return '<a class="' + classes + '" data-nav' + attrs + ' href="' + item.href + '">' + content + '</a>';
  }

  function render() {
    var mount = document.getElementById('sidebar-mount');
    if (!mount) return;

    var html = '';
    html += '<div class="doc-sidebar__header"><a href="' + BASE + 'index.html"><img class="logo" src="' + BASE + 'assets/logo/logo-brand.svg" alt="BLUESOFT" /></a></div>';
    html += '<div class="doc-sidebar__search">' +
      '<div class="input input-md input-normal"><div class="input__field"><div class="input__content">' +
      '<svg class="input__icon"><use href="' + BASE + 'assets/icons/sprite.svg#icon-base-search"></use></svg>' +
      '<input class="input__control" id="doc-search" placeholder="컴포넌트 검색" autocomplete="off" />' +
      '</div></div></div></div>';

    html += '<div class="doc-sidebar__nav">';
    NAV.forEach(function (group) {
      if (group.standalone) {
        html += '<div class="doc-nav-group">' + itemHtml(group, false) + '</div>';
        return;
      }
      html += '<div class="doc-nav-group" data-nav-group>';
      html += itemHtml(group, false);
      group.children.forEach(function (child) {
        html += itemHtml(child, true);
      });
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="doc-sidebar__footer">' +
      '<a class="side-nav-item side-nav-item-light" href="https://github.com/bluesmurflenda/bluesoft-design-system" target="_blank" rel="noopener">' +
      '<span class="side-nav-item__content">' + iconSvg('external-link') + '<span class="side-nav-item__label">GitHub 저장소</span></span>' +
      '</a></div>';

    mount.innerHTML = html;

    // 현재 페이지 강조 — pathname 끝부분(파일명)을 비교한다.
    var currentFile = location.pathname.split('/').pop() || 'index.html';
    mount.querySelectorAll('[data-nav]').forEach(function (a) {
      var hrefFile = a.getAttribute('href').split('/').pop();
      a.classList.toggle('side-nav-item-selected', hrefFile === currentFile);
    });

    // 검색 필터 — 하위 항목 텍스트로 필터링, 전부 숨겨진 그룹은 그룹째로 숨김
    var searchInput = document.getElementById('doc-search');
    var navGroups = mount.querySelectorAll('[data-nav-group]');
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase();
      navGroups.forEach(function (group) {
        var children = group.querySelectorAll('[data-nav-child]');
        var anyVisible = false;
        children.forEach(function (child) {
          var match = !q || child.textContent.toLowerCase().indexOf(q) !== -1;
          child.classList.toggle('doc-search-hidden', !match);
          if (match) anyVisible = true;
        });
        group.classList.toggle('doc-search-hidden', !!q && !anyVisible);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
