---
layout: home
---


<div id="hero-section" class="container-fluid">
  <div class="row gutter">
    <div class="text-center main-text">
      <h1 class="display-3">Remote Procedure Calls in Typescript made simple</h1>
      <p class="lead">rpc_ts provides a hassle-free way to define APIs in TypeScript, to build isomorphic applications faster.</p>
    </div>
  </div>
  <div class="row gutter button-container">
    {% include button.html color="blue" url="/docs" text="Get Started" %}
    {% include button.html color="white" url="https://github.com/aiden/rpc_ts" text="Github" %}
  </div>


  <div class="row gutter ups-section">
    {% for item in site.data.usps %}
      <div class="col-md p-md-4 py-3 usp-container {{ item.position }}">
        <p class="usp-title">{{ item.title }}</p>
        <p class="usp-description">{{ item.description }}</p>
      </div>
    {% endfor %}
  </div>
</div>


<div class="quicklook-section container-fluid">
  <div class="row gutter">
    <div class="col-md-4">
      <h3>A Quick Look</h3>
    </div>

    <div class="col-md-8">
      {% for item in site.data.code_samples %}

        <p class="section-title">{{ item.section }}</p>
        <p class="section-sub-title">{{ item.description }}</p>

        <div class="codeBlock">
          {% highlight TypeScript %}
            {{ item.code }}
          {% endhighlight %}
        </div>

      {% endfor %}

      <div class="row gutter button-container">
        {% include button.html color="blue" url="/docs" text="Get Started" %}
      </div>

    </div>
  </div>
</div>
