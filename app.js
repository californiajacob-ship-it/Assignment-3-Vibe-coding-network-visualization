(function () {
  "use strict";

  var D = window.DATA;
  var AREAS = [
    { id: "Arts", color: "var(--arts)" },
    { id: "Child Well-being", color: "var(--child)" },
    { id: "Environment", color: "var(--env)" },
    { id: "Medical Research", color: "var(--med)" }
  ];
  var COLOR = {};
  AREAS.forEach(function (a) { COLOR[a.id] = a.color; });

  var SHORT = {
    "DDF and Ford technology grants": "DDF + Ford tech grants",
    "MAP Fund regranting (DDF + Mellon, since 2008)": "MAP Fund",
    "National Dance Project (reported 2025)": "National Dance Project",
    "Tribal Nations Conservation Pledge": "Tribal Nations Pledge",
    "Think of Us, Audacious Project": "Think of Us",
    "Collective to Strengthen Pathways for Health Research": "Health Research Pathways",
    "COVID-19 Fund to Retain Clinical Scientists": "COVID-19 Scientists Fund"
  };

  // Order around the ring. Big programs sit apart so their funder clusters do not pile up.
  var ORDER = [
    "Mosaic Network and Fund", "DDF and Ford technology grants", "Humanity AI", "Artists Make Technology",
    "MAP Fund regranting (DDF + Mellon, since 2008)", "National Dance Project (reported 2025)", "Artist Relief",
    "Catalyst Fund", "Tribal Nations Conservation Pledge",
    "OPT-In for Families", "Think of Us, Audacious Project",
    "COVID-19 Fund to Retain Clinical Scientists", "Collective to Strengthen Pathways for Health Research"
  ];

  var programs = ORDER.map(function (name) {
    var p = D.programs.find(function (q) { return q.name === name; });
    return {
      kind: "program", id: "p:" + p.name, name: p.name, short: SHORT[p.name] || p.name,
      area: p.area, year: p.year, amount: p.amount, basis: p.basis, source: p.source,
      funders: p.funders.filter(function (f) { return f !== "DDF"; })
    };
  });
  // Any program not in ORDER still shows up.
  D.programs.forEach(function (p) {
    if (ORDER.indexOf(p.name) < 0) {
      programs.push({ kind: "program", id: "p:" + p.name, name: p.name, short: p.name, area: p.area, year: p.year,
        amount: p.amount, basis: p.basis, source: p.source, funders: p.funders.filter(function (f) { return f !== "DDF"; }) });
    }
  });

  var funderMap = {};
  programs.forEach(function (p) {
    p.funders.forEach(function (f) {
      if (!funderMap[f]) funderMap[f] = { kind: "funder", id: "f:" + f, name: f, programs: [] };
      funderMap[f].programs.push(p);
    });
  });
  var funders = Object.keys(funderMap).map(function (k) { return funderMap[k]; });
  var ddf = { kind: "ddf", id: "ddf", name: "Doris Duke Foundation", x: 0, y: 0, fx: 0, fy: 0, r: 32 };

  // ---------- formatting ----------
  var money = function (m) {
    if (m == null) return null;
    if (m >= 1000) return "$" + (m / 1000).toFixed(1).replace(/\.0$/, "") + "B";
    return "$" + (m % 1 ? m.toFixed(1) : m) + "M";
  };
  var bil = function (b) { return b >= 1 ? "$" + b.toFixed(2).replace(/0$/, "").replace(/\.0$/, "") + "B" : "$" + Math.round(b * 1000) + "M"; };
  var endowBasis = function (s) {
    var map = {
      "FY23 AUM": "assets under management, fiscal year 2023",
      "2024 total assets, annual report": "total assets, 2024 annual report",
      "2024 total assets": "total assets, 2024 tax filing",
      "2023 total assets": "total assets, 2023 tax filing",
      "total assets, year not stated": "total assets, year not stated"
    };
    return map[s] || s;
  };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  var displayName = function (f) { return f === "DDF" ? "Doris Duke Foundation" : f; };
  var plural = function (n, one, many) { return n + " " + (n === 1 ? one : many); };

  // ---------- layout ----------
  var R = 248;
  var rProg = d3.scaleSqrt().domain([0, 500]).range([11, 46]);
  var weights = programs.map(function (p) { return 1 + p.funders.length / 6; });
  var total = d3.sum(weights), acc = 0;
  programs.forEach(function (p, i) {
    var a = -Math.PI / 2 + ((acc + weights[i] / 2) / total) * Math.PI * 2;
    acc += weights[i];
    p.angle = a;
    p.x = p.fx = Math.cos(a) * R;
    p.y = p.fy = Math.sin(a) * R;
    p.r = p.amount == null ? 14 : rProg(p.amount);
  });
  funders.forEach(function (f) {
    var n = f.programs.length;
    f.r = n === 1 ? 5 : 5 + 2 * n;
    if (n === 1) {
      var p = f.programs[0];
      var k = (R + p.r + 22 + Math.sqrt(p.funders.length) * 5) / R;
      f.ax = p.x * k; f.ay = p.y * k;
      f.color = COLOR[p.area];
    } else {
      f.ax = d3.mean(f.programs, function (p) { return p.x; }) * 0.85;
      f.ay = d3.mean(f.programs, function (p) { return p.y; }) * 0.85;
    }
    f.x = f.ax; f.y = f.ay;
  });

  var links = [];
  programs.forEach(function (p) { links.push({ source: ddf, target: p, spoke: true }); });
  funders.forEach(function (f) { f.programs.forEach(function (p) { links.push({ source: f, target: p }); }); });

  var nodes = [ddf].concat(programs, funders);
  var sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links.filter(function (l) { return !l.spoke; }))
      .distance(function (l) { return l.target.r + 26; })
      .strength(function (l) { return l.source.programs.length === 1 ? 0.3 : 0.12; }))
    .force("x", d3.forceX(function (d) { return d.ax || 0; }).strength(function (d) { return d.kind === "funder" ? 0.1 : 0; }))
    .force("y", d3.forceY(function (d) { return d.ay || 0; }).strength(function (d) { return d.kind === "funder" ? 0.1 : 0; }))
    .force("charge", d3.forceManyBody().strength(-10))
    .force("collide", d3.forceCollide(function (d) { return d.r + 2.5; }).iterations(3))
    .stop();
  for (var i = 0; i < 420; i++) {
    sim.tick();
    funders.forEach(function (f) {
      f.x = Math.max(-458, Math.min(458, f.x));
      f.y = Math.max(-458, Math.min(458, f.y));
    });
  }

  // ---------- drawing ----------
  // Fit the view to the laid-out nodes, with room for labels.
  var pad = 70;
  var x0 = d3.min(nodes, function (d) { return d.x - d.r; }) - pad, x1 = d3.max(nodes, function (d) { return d.x + d.r; }) + pad;
  var y0 = d3.min(nodes, function (d) { return d.y - d.r; }) - 30, y1 = d3.max(nodes, function (d) { return d.y + d.r; }) + 30;
  var svg = d3.select("#map").attr("viewBox", [x0, y0, x1 - x0, y1 - y0].join(" "));
  svg.append("rect").attr("class", "bg").attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0)
    .on("click", function () { setFocus(null); });

  var gLinks = svg.append("g");
  var gNodes = svg.append("g");

  var linkSel = gLinks.selectAll("line").data(links).join("line")
    .attr("class", function (l) { return "link" + (l.spoke ? " spoke" : ""); })
    .attr("x1", function (l) { return l.source.x; }).attr("y1", function (l) { return l.source.y; })
    .attr("x2", function (l) { return l.target.x; }).attr("y2", function (l) { return l.target.y; });

  var drawOrder = [ddf].concat(funders, programs);
  var nodeSel = gNodes.selectAll("g.node").data(drawOrder, function (d) { return d.id; }).join("g")
    .attr("class", function (d) {
      var c = "node " + (d.kind === "program" ? "prog" : d.kind);
      if (d.kind === "program" && d.amount == null) c += " no-amt";
      if (d.kind === "funder" && d.programs.length > 1) c += " many";
      return c;
    })
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

  nodeSel.append("circle").attr("r", function (d) { return d.r; })
    .attr("fill", function (d) {
      if (d.kind === "program") return COLOR[d.area];
      if (d.kind === "funder" && d.programs.length === 1) return d.color;
      return null;
    })
    .attr("fill-opacity", function (d) { return d.kind === "funder" && d.programs.length === 1 ? 0.6 : null; });

  // Programs and DDF can be reached with the keyboard. Funders are reachable through the panel.
  nodeSel.filter(function (d) { return d.kind !== "funder"; })
    .attr("tabindex", 0).attr("role", "button")
    .attr("aria-label", function (d) { return d.kind === "ddf" ? "Doris Duke Foundation" : d.name; });

  nodeSel.filter(function (d) { return d.kind === "ddf"; }).append("text")
    .attr("text-anchor", "middle").attr("dy", "0.35em").text("DDF");

  nodeSel.filter(function (d) { return d.kind === "program"; }).append("text")
    .attr("class", "plabel")
    .each(function (d) {
      var ux = Math.cos(d.angle), uy = Math.sin(d.angle);
      var t = d3.select(this);
      var off = d.r + 9;
      t.attr("x", -ux * off).attr("y", -uy * off)
        .attr("text-anchor", ux > 0.4 ? "end" : ux < -0.4 ? "start" : "middle")
        .attr("dy", uy > 0.4 ? "-0.1em" : uy < -0.4 ? "0.85em" : "0.35em")
        .text(d.short);
    });

  nodeSel.filter(function (d) { return d.kind === "funder"; }).append("text")
    .attr("class", "flabel")
    .attr("x", function (d) { return d.x >= 0 ? d.r + 3 : -d.r - 3; })
    .attr("text-anchor", function (d) { return d.x >= 0 ? "start" : "end"; })
    .attr("dy", "0.35em")
    .text(function (d) { return d.name; });

  // ---------- tooltip ----------
  var tip = document.getElementById("tip");
  var mapBox = document.querySelector(".map");
  var tipText = function (d) {
    if (d.kind === "ddf") return "<b>Doris Duke Foundation</b>In all " + programs.length + " programs";
    if (d.kind === "program") return "<b>" + esc(d.name) + "</b>" + (money(d.amount) || "Amount not found") + ", " + plural(d.funders.length + 1, "funder", "funders");
    var n = d.programs.length;
    return "<b>" + esc(d.name) + "</b>" + (n === 1 ? "In " + esc(d.programs[0].short) : "In " + n + " programs");
  };
  nodeSel
    .on("pointerenter", function (e, d) {
      if (e.pointerType !== "mouse") return;
      tip.innerHTML = tipText(d);
      tip.hidden = false;
    })
    .on("pointermove", function (e) {
      if (tip.hidden) return;
      var b = mapBox.getBoundingClientRect();
      var x = e.clientX - b.left + 14, y = e.clientY - b.top + 14;
      if (x + tip.offsetWidth > b.width - 6) x = e.clientX - b.left - tip.offsetWidth - 14;
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    })
    .on("pointerleave", function () { tip.hidden = true; })
    .on("click", function (e, d) {
      e.stopPropagation();
      tip.hidden = true;
      activate(d, true);
    })
    .on("keydown", function (e, d) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(d, true); }
    });

  function activate(d, fromMap) {
    var next = d.kind === "ddf" ? { kind: "ddf" } : { kind: d.kind, id: d.id };
    if (focus && focus.kind === next.kind && focus.id === next.id) setFocus(null);
    else setFocus(next, fromMap);
  }

  // ---------- focus state ----------
  var focus = null;
  var byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });

  function setFocus(f, fromMap) {
    focus = f;
    var hot = new Set(), hotLinks = new Set(), picked = null, labelFunders = false;

    if (f && f.kind === "program") {
      var p = byId[f.id]; picked = p;
      hot.add(p); hot.add(ddf);
      p.funders.forEach(function (n) { hot.add(funderMap[n]); });
      labelFunders = p.funders.length <= 15;
    } else if (f && f.kind === "funder") {
      var fu = byId[f.id]; picked = fu;
      hot.add(fu); hot.add(ddf);
      fu.programs.forEach(function (q) { hot.add(q); });
    } else if (f && f.kind === "area") {
      hot.add(ddf);
      programs.forEach(function (q) {
        if (q.area === f.id) { hot.add(q); q.funders.forEach(function (n) { hot.add(funderMap[n]); }); }
      });
    } else if (f && f.kind === "ddf") {
      picked = ddf;
      nodes.forEach(function (n) { hot.add(n); });
    }

    links.forEach(function (l) {
      if (!f) return;
      if (f.kind === "funder") { if (l.source === picked || (l.spoke && hot.has(l.target))) hotLinks.add(l); }
      else if (f.kind === "program") { if (l.target === picked) hotLinks.add(l); }
      else if (hot.has(l.source) && hot.has(l.target)) hotLinks.add(l);
    });

    svg.classed("focusing", !!f && f.kind !== "ddf");
    nodeSel.classed("hot", function (d) { return hot.has(d); })
      .classed("picked", function (d) { return d === picked; });
    placeLabels(function (d) {
      return d === picked || (labelFunders && hot.has(d)) || (d.programs.length > 1 && (!f || hot.has(d)));
    }, picked, f ? hot : null);
    linkSel.classed("hot", function (l) { return hotLinks.has(l); });

    document.querySelectorAll(".area-btn").forEach(function (b) {
      var on = b.dataset.area === "" ? !f : (f && f.kind === "area" && f.id === b.dataset.area);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll(".prow[data-id]").forEach(function (b) {
      b.setAttribute("aria-current", f && f.kind === "program" && f.id === b.dataset.id ? "true" : "false");
    });

    renderCard();
    if (fromMap && window.matchMedia("(max-width: 900px)").matches) {
      var card = document.getElementById("card");
      var top = card.getBoundingClientRect().top;
      if (top > window.innerHeight - 120 || top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Show funder labels without letting them cover program names, circles, or each other.
  // Each label tries the right side, then the left; if both collide it waits for hover.
  function placeLabels(wants, picked, hot) {
    var boxes = [];
    var hit = function (b) {
      if (b.x < x0 + 4 || b.x + b.w > x1 - 4) return true;
      return boxes.some(function (o) { return b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y; });
    };
    nodeSel.each(function (d) {
      if (d.kind === "funder") return;
      if (hot && !hot.has(d)) return;
      boxes.push({ x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2 });
      var t = this.querySelector("text");
      if (t) { var b = t.getBBox(); boxes.push({ x: b.x + d.x - 2, y: b.y + d.y - 1, w: b.width + 4, h: b.height + 2 }); }
    });
    var cands = funders.filter(wants).sort(function (a, b) {
      return (b === picked) - (a === picked) || b.programs.length - a.programs.length;
    });
    nodeSel.select(".flabel").classed("show", false);
    cands.forEach(function (d) {
      var t = nodeSel.filter(function (n) { return n === d; }).select(".flabel");
      var w = t.node().getComputedTextLength(), h = 14;
      var sides = d.x >= 0 ? [1, -1] : [-1, 1];
      for (var i = 0; i < 2; i++) {
        var s = sides[i];
        var b = { x: s > 0 ? d.x + d.r + 3 : d.x - d.r - 3 - w, y: d.y - h / 2, w: w, h: h };
        if (!hit(b) || (d === picked && i === 1)) {
          if (hit(b) && d === picked) s = sides[0];
          t.attr("x", s > 0 ? d.r + 3 : -d.r - 3).attr("text-anchor", s > 0 ? "start" : "end").classed("show", true);
          boxes.push(b);
          return;
        }
      }
    });
  }

  // ---------- card ----------
  var cardEl = document.getElementById("card");
  var back = '<button type="button" class="back" data-act="clear">&larr; Show everything</button>';

  function programRows(list) {
    return list.map(function (p) {
      return '<button type="button" class="prow" data-go="' + esc(p.id) + '"><span>' + esc(p.short) + '</span><span class="amt">' +
        (money(p.amount) || "no amount") + "</span></button>";
    }).join("");
  }
  function funderChip(name) {
    if (name === "DDF") return '<button type="button" class="chip" data-go="ddf">Doris Duke Foundation</button>';
    var f = funderMap[name], n = f.programs.length;
    return '<button type="button" class="chip" data-go="' + esc(f.id) + '">' + esc(name) +
      (n > 1 ? ' <span class="n" title="In ' + n + ' programs">' + n + "</span>" : "") + "</button>";
  }
  function endowLine(key) {
    var e = D.endowments[key];
    if (!e) return "<p>No endowment figure found.</p>";
    return "<p>Endowment " + bil(e.billions) + " <span class=\"basis\">(" + esc(endowBasis(e.basis)) + ")</span></p>";
  }
  function siteLink(key) {
    var w = D.websites[key];
    return w ? '<a class="src" href="' + esc(w) + '" target="_blank" rel="noopener">Visit website</a>' : "";
  }

  function renderCard() {
    var f = focus, h = "";
    if (!f) {
      var shared = funders.filter(function (x) { return x.programs.length > 1; }).length;
      h = '<span class="eyebrow">Start here</span>' +
        "<h2>Click any circle or dot</h2>" +
        "<p>The card here shows what you picked: how much money a program has, who funds it, and where the number comes from. " +
        "Most funders appear in only one program. The " + shared + " gold dots are funders that joined DDF in two or more programs.</p>" +
        "<h3>Or try one of these</h3>" +
        '<div class="tries">' +
        '<button type="button" class="try" data-go="p:Humanity AI">See the largest program, Humanity AI ($500M)</button>' +
        '<button type="button" class="try" data-go="f:Ford">Follow Ford, which is in 5 of the 13 programs</button>' +
        '<button type="button" class="try" data-area="Environment">Show only the Environment programs</button>' +
        "</div>";
    } else if (f.kind === "program") {
      var p = byId[f.id];
      var all = ["DDF"].concat(p.funders.slice().sort(function (a, b) {
        return funderMap[b].programs.length - funderMap[a].programs.length || a.localeCompare(b);
      }));
      h = back +
        '<div><span class="eyebrow"><span class="sw" style="background:' + COLOR[p.area] + '"></span>' + esc(p.area) + "</span></div>" +
        "<h2>" + esc(p.name) + "</h2>" +
        (p.amount != null ? '<p class="big">' + money(p.amount) + "</p>" : '<p class="big none">Amount not found</p>') +
        (p.amount != null ? '<p class="basis">' + esc(p.basis) + "</p>" : "") +
        "<p>Announced or reported in " + p.year + ".</p>" +
        "<h3>" + plural(all.length, "funder", "funders") + "</h3>" +
        '<div class="chips">' + all.map(funderChip).join("") + "</div>" +
        (all.some(function (n) { return n !== "DDF" && funderMap[n].programs.length > 1; })
          ? '<p class="basis">A number next to a name is how many of the 13 programs that funder is in.</p>' : "") +
        (p.source ? '<a class="src" href="' + esc(p.source) + '" target="_blank" rel="noopener">Read the source</a>'
          : '<p class="basis">No source link on record.</p>');
    } else if (f.kind === "funder") {
      var fu = byId[f.id], n = fu.programs.length;
      h = back + '<div><span class="eyebrow">Funder</span></div>' +
        "<h2>" + esc(fu.name) + "</h2>" +
        "<p>" + (n === 1 ? "In 1 program with DDF." : "In " + n + " of the " + programs.length + " programs with DDF.") + "</p>" +
        endowLine(fu.name) +
        "<h3>" + (n === 1 ? "Program" : "Programs") + "</h3>" + programRows(fu.programs) +
        siteLink(fu.name);
    } else if (f.kind === "area") {
      var list = programs.filter(function (q) { return q.area === f.id; });
      var others = new Set();
      list.forEach(function (q) { q.funders.forEach(function (x) { others.add(x); }); });
      var sum = d3.sum(list, function (q) { return q.amount || 0; });
      h = back +
        '<div><span class="eyebrow"><span class="sw" style="background:' + COLOR[f.id] + '"></span>Program area</span></div>' +
        "<h2>" + esc(f.id) + "</h2>" +
        "<p>" + plural(list.length, "program", "programs") + " with " + plural(others.size, "other funder", "other funders") + " besides DDF." +
        (sum ? " The listed amounts add up to " + money(sum) + ", but they measure different things, so treat the total as rough." : "") + "</p>" +
        "<h3>Programs</h3>" + programRows(list);
    } else if (f.kind === "ddf") {
      h = back + '<div><span class="eyebrow">The foundation at the center</span></div>' +
        "<h2>Doris Duke Foundation</h2>" +
        "<p>In all " + programs.length + " programs on this map, alongside " + funders.length + " other funders.</p>" +
        endowLine("DDF") +
        "<h3>Programs</h3>" + programRows(programs) + siteLink("DDF");
    }
    cardEl.innerHTML = h;
  }

  // Clicks inside the card and lists
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go],[data-act],[data-area]");
    if (!t || t.closest("#map")) return;
    if (t.dataset.act === "clear") { setFocus(null); return; }
    if (t.hasAttribute("data-area")) {
      var a = t.dataset.area;
      setFocus(a ? { kind: "area", id: a } : null);
      return;
    }
    var id = t.dataset.go;
    var inList = !!t.closest(".lists");
    setFocus(id === "ddf" ? { kind: "ddf" } : { kind: id.slice(0, 1) === "p" ? "program" : "funder", id: id });
    if (inList || t.closest(".card")) {
      if (window.matchMedia("(max-width: 900px)").matches) cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (cardEl.getBoundingClientRect().top < 0) cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && focus) setFocus(null);
  });

  // ---------- area buttons ----------
  var areasEl = document.getElementById("areas");
  var areaHtml = '<button type="button" class="area-btn" data-area="" aria-pressed="true">All programs <span class="n">' + programs.length + "</span></button>";
  AREAS.forEach(function (a) {
    var n = programs.filter(function (p) { return p.area === a.id; }).length;
    areaHtml += '<button type="button" class="area-btn" data-area="' + esc(a.id) + '" aria-pressed="false"><span class="sw" style="background:' + a.color + '"></span>' +
      esc(a.id) + ' <span class="n">' + n + "</span></button>";
  });
  areasEl.innerHTML = areaHtml;

  // ---------- program list ----------
  var listEl = document.getElementById("program-list");
  listEl.innerHTML = AREAS.map(function (a) {
    var list = programs.filter(function (p) { return p.area === a.id; })
      .sort(function (x, y) { return (y.amount || 0) - (x.amount || 0); });
    return '<div class="group"><p class="group-h"><span class="sw" style="background:' + a.color + '"></span>' + esc(a.id) + "</p>" +
      list.map(function (p) {
        return '<button type="button" class="prow" data-go="' + esc(p.id) + '" data-id="' + esc(p.id) + '" aria-current="false"><span>' + esc(p.short) +
          '</span><span class="amt">' + (money(p.amount) || "no amount") + "</span></button>";
      }).join("") + "</div>";
  }).join("");

  // ---------- shared funders ----------
  var sharedEl = document.getElementById("shared-list");
  sharedEl.innerHTML = funders.filter(function (f) { return f.programs.length > 1; })
    .sort(function (a, b) { return b.programs.length - a.programs.length || a.name.localeCompare(b.name); })
    .map(function (f) { return funderChip(f.name); }).join("");

  // ---------- search ----------
  var search = document.getElementById("search");
  var miss = document.getElementById("find-miss");
  document.getElementById("funder-list").innerHTML = ["Doris Duke Foundation"].concat(funders.map(function (f) { return f.name; }).sort())
    .map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("");

  function findFunder(q, loose) {
    q = q.trim().toLowerCase();
    if (!q) return null;
    if (q === "ddf" || q === "doris duke foundation") return "ddf";
    var exact = funders.find(function (f) { return f.name.toLowerCase() === q; });
    if (exact) return exact.id;
    if (!loose) return null;
    var hits = funders.filter(function (f) { return f.name.toLowerCase().indexOf(q) >= 0; });
    return hits.length ? hits[0].id : null;
  }
  function go(id) {
    setFocus(id === "ddf" ? { kind: "ddf" } : { kind: "funder", id: id });
  }
  search.addEventListener("input", function () {
    miss.hidden = true;
    var id = findFunder(search.value, false);
    if (id) go(id);
  });
  search.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var id = findFunder(search.value, true);
    if (id) { go(id); miss.hidden = true; } else if (search.value.trim()) miss.hidden = false;
  });

  setFocus(null);
})();
