---
layout: home
title: Why
---

<div id="hero-section" class="container-fluid">
  <div class="row gutter">
      <h1 class="col-md-12 display-3 mt-5 text-left">Why rpc_ts?</h1>
  </div>
</div>

{% for item in site.data.why %}
  <div class="quicklook-section container-fluid background-{{ item.color }}">
    <div class="row gutter">
      <div class="col-md-4">
        <h3>{{ item.title }}</h3>
      </div>

      <div class="col-md-8">
          <p class="why-reason">{{ item.reason }}</p>

          {% if item.subreason1 %}
            <ul class="why-subreasons-container">
              <li class="why-subreasons-item">{{ item.subreason1 }}</li>
              <li class="why-subreasons-item">{{ item.subreason2 }}</li>
              <li class="why-subreasons-item">{{ item.subreason3 }}</li>
            </ul>
          {% endif %}

      </div>
    </div>
  </div>
{% endfor %}
