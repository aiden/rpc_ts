---
layout: home
---




<div id="hero-section" class="container-fluid">
  <div class="row gutter">
    <div class="text-center main-text">
      <h1 class="display-3">Remote Procedure Calls in Typescript made simple</h1>
      <p class="lead">rpc_ts provides a hassle-free way to define APIs in TypeScript, to build isomorphic applications faster.</p>
      <a class="btn btn-primary btn-lg" href="#" role="button">Get Started</a>
      <a class="btn btn-primary btn-lg" href="#" role="button">Github</a>
    </div>
  </div>


  <div class="row gutter ups-section">
    {% for item in site.data.usps %}
      <div class="col-sm">
        <p class="usp-title">{{ item.title }}</p>
        <p class="usp-description">{{ item.description }}</p>
      </div>
    {% endfor %}
  </div>
</div>


<div>
  <p> test</p>
  {% for item in site.data.code_samples %}

    <p>{{ item.section }}</p>
    <div class="codeBlock">
      {% highlight TypeScript %}
        {{ item.code }}
      {% endhighlight %}
    </div>

  {% endfor %}
</div>
