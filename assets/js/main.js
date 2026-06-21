/* =========================================================
   Human Team Foundation — main script
   ========================================================= */
(function () {
  "use strict";

  /* ---- Header shadow on scroll ---- */
  var header = document.getElementById("header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile nav toggle ---- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      toggle.classList.toggle("open");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.classList.remove("open");
      });
    });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Animated counters ---- */
  var counters = document.querySelectorAll("[data-count]");
  var runCounter = function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1600, start = 0, t0 = null;
    var step = function (ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var val = Math.floor((0.5 - Math.cos(p * Math.PI) / 2) * (target - start) + start);
      el.textContent = val.toLocaleString("en-IN") + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- Render projects ---- */
  var fmt = function (n) { return "₹" + Number(n).toLocaleString("en-IN"); };
  var renderProjects = function (mount, limit) {
    var data = window.HTF_PROJECTS || [];
    if (limit) data = data.slice(0, limit);
    mount.innerHTML = data.map(function (p) {
      var pct = Math.min(Math.round((p.raised / p.goal) * 100), 100);
      return '' +
        '<article class="project-card reveal">' +
          '<div class="project-media" style="background-image:url(\'' + p.image + '\')">' +
            '<span class="project-tag">' + p.category + '</span>' +
          '</div>' +
          '<div class="project-body">' +
            '<h3>' + p.title + '</h3>' +
            '<p>' + p.description + '</p>' +
            '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
            '<div class="progress-meta"><span>Raised <strong>' + fmt(p.raised) + '</strong></span>' +
            '<span>Goal ' + fmt(p.goal) + '</span></div>' +
            '<a href="donate.html" class="btn btn-accent btn-sm">Donate to this</a>' +
          '</div>' +
        '</article>';
    }).join("");
    // re-observe newly added reveals
    mount.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  };
  var homeMount = document.getElementById("projects-featured");
  if (homeMount) renderProjects(homeMount, 3);
  var allMount = document.getElementById("projects-all");
  if (allMount) renderProjects(allMount);

  /* ---- Donate amount selector ---- */
  var amountBtns = document.querySelectorAll(".amount-btn");
  var customAmount = document.getElementById("customAmount");
  amountBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      amountBtns.forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      if (customAmount) customAmount.value = b.getAttribute("data-amt");
    });
  });

  /* ---- Contact form (front-end demo) ---- */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = document.getElementById("formStatus");
      if (status) status.textContent = "Thank you! We'll get back to you soon.";
      form.reset();
    });
  }

  /* ---- Footer year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
