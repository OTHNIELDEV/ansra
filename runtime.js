/* ANSRA mockup runtime: renders the <x-dc> template with a small state-driven patcher. */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  function look(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    var v = scope, parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function text(s, scope) {
    return s.replace(HOLE, function (_, p) { var v = look(p, scope); return v == null ? '' : String(v); });
  }
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(text(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase(), i, kids = node.childNodes;
    if (tag === 'sc-for') {
      var list = look(node.getAttribute('list').match(WHOLE)[1], scope) || [], as = node.getAttribute('as');
      list.forEach(function (item, idx) {
        var s = Object.create(scope); s[as] = item; s.$index = idx;
        for (var k = 0; k < kids.length; k++) build(kids[k], s, out);
      });
      return;
    }
    if (tag === 'sc-if') {
      if (look(node.getAttribute('value').match(WHOLE)[1], scope)) for (i = 0; i < kids.length; i++) build(kids[i], scope, out);
      return;
    }
    var el = document.createElementNS(node.namespaceURI, node.localName);
    el.__h = {};
    for (i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i], m = a.value.match(WHOLE);
      if (m) {
        var v = look(m[1], scope);
        if (/^on[A-Z]/.test(a.name) || (a.name.slice(0, 2) === 'on' && typeof v === 'function')) { el.__h[a.name.slice(2).toLowerCase()] = v; continue; }
        if (v == null || (v === false && a.name.indexOf('aria-') !== 0)) continue;
        el.setAttribute(a.name, String(v));
      } else el.setAttribute(a.name, text(a.value, scope));
    }
    var sub = [];
    for (i = 0; i < kids.length; i++) build(kids[i], scope, sub);
    sub.forEach(function (c) { el.appendChild(c); });
    out.push(el);
  }
  function listen(el) {
    Object.keys(el.__h || {}).forEach(function (ev) {
      if (el['__l' + ev]) return;
      el['__l' + ev] = true;
      el.addEventListener(ev, function (e) { var f = el.__h[ev]; if (f) f(e); });
    });
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) listen(c);
  }
  function patch(parent, fresh) {
    var old = Array.prototype.slice.call(parent.childNodes), i;
    for (i = 0; i < fresh.length; i++) {
      var n = fresh[i], o = old[i];
      if (!o) { if (n.nodeType === 1) listen(n); parent.appendChild(n); continue; }
      if (o.nodeType !== n.nodeType || (n.nodeType === 1 && o.tagName !== n.tagName)) { if (n.nodeType === 1) listen(n); parent.replaceChild(n, o); continue; }
      if (n.nodeType === 3) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; continue; }
      var j, at = n.attributes;
      for (j = o.attributes.length - 1; j >= 0; j--) if (!n.hasAttribute(o.attributes[j].name)) o.removeAttribute(o.attributes[j].name);
      for (j = 0; j < at.length; j++) if (o.getAttribute(at[j].name) !== at[j].value) o.setAttribute(at[j].name, at[j].value);
      o.__h = n.__h; listen(o);
      patch(o, Array.prototype.slice.call(n.childNodes));
    }
    for (i = old.length - 1; i >= fresh.length; i--) parent.removeChild(old[i]);
  }
  function start() {
    var host = document.querySelector('x-dc'), src = document.querySelector('script[data-dc-script]');
    var helmet = host.querySelector('helmet');
    if (helmet) { while (helmet.firstChild) document.head.appendChild(helmet.firstChild); helmet.remove(); }
    var tpl = document.createElement('div');
    while (host.firstChild) tpl.appendChild(host.firstChild);
    var queued = false, comp;
    function render() {
      queued = false;
      var out = [], vals = comp.renderVals();
      for (var i = 0; i < tpl.childNodes.length; i++) build(tpl.childNodes[i], vals, out);
      patch(host, out);
    }
    function DCLogic(props) { this.props = props || {}; this.state = {}; }
    DCLogic.prototype.setState = function (p) {
      this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p);
      if (!queued) { queued = true; Promise.resolve().then(render); }
    };
    DCLogic.prototype.forceUpdate = function () { render(); };
    var Component = new Function('DCLogic', src.textContent + ';return Component;')(DCLogic);
    comp = new Component({});
    render();
    if (comp.componentDidMount) comp.componentDidMount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
