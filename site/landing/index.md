---
layout: home
---

<div id="hero-section" class="container-fluid">
  <div class="row gutter">
    <div class="text-center main-text">
      <h1 class="display-3">Remote Procedure Calls in Typescript made simple 🤞</h1>
      <p class="lead">rpc_ts provides a hassle-free way to define APIs in TypeScript so that we can build isomorphic web applications faster.</p>
    </div>
  </div>
  <div class="row gutter button-container">
    {% include button.html color="blue" url="#examples" text="Get Started" %}
    {% include button.html color="white" url="https://github.com/aiden/rpc_ts" text="GitHub" target="_blank" %}
  </div>

  <div class="row">
    <div class="container-fluid usp-container">
      <div class="row gutter ups-section">
        {% for item in site.data.usps %}
          <div class="col-md p-md-3 py-3 {{ item.position }}">
            <p class="usp-title">{{ item.title }}</p>
            <p class="usp-description">{{ item.description }}</p>
          </div>
        {% endfor %}
      </div>
    </div>
  </div>
</div>

<div class="quicklook-section container-fluid">
  <div class="row gutter">
    <div class="col-lg-12">
      <h3 style="margin: 0; margin-bottom: -20px"><a name="syntax" id="syntax"></a>Syntax</h3>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-lg-12">
      <p class="section-title">RPC Service Definition</p>
      <div class="codeBlock">{% highlight TypeScript %}
const helloService = {
    getHello: {
    request: {} as { language: string },
    response: {} as { text: string },
  },
};
{% endhighlight %}</div>
    </div>
    <div class="col-lg-12">
      <p class="section-title">RPC Server</p>
      <div class="codeBlock">{% highlight TypeScript %}
const app = express();
app.use(ModuleRpcProtocolServer.registerRpcRoutes(helloService, {
  async getHello({ language }) {
    if (language === 'Spanish') return { text: 'Hola' };
    return { text: 'Hello' };
  },
}));
http.createServer(app).listen(3000);
{% endhighlight %}</div>
    </div>
    <div class="col-lg-12">
      <p class="section-title">Type-Safe Remote Procedure Call</p>
      <div class="codeBlock">{% highlight TypeScript %}
const { text } = await ModuleRpcProtocolClient.getRpcClient(helloService, {
  remoteAddress: 'http://localhost:3000'
}).nice().getHello({ language: 'Spanish' });
{% endhighlight %}</div>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-lg-12">
      <h3 id="examples"><a name="examples"></a>Examples</h3>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-sm-4 d-flex align-items-stretch">
      <div class="card w-100">
        <div class="card-body">
          <h5 class="card-title">rpc_ts_primer</h5>
          <p class="card-text">A minimal, functional example for rpc_ts.</p>
          <a href="https://github.com/aiden/rpc_ts_primer" class="btn btn-primary" target="_blank">
            <img class="github" src="/assets/images/github_reverse.svg" />
            GitHub
          </a>
        </div>
      </div>
    </div>
    <div class="col-sm-4 d-flex align-items-stretch">
      <div class="card w-100 text-white bg-primary">
        <div class="card-body">
          <h5 class="card-title">rpc_ts_chat</h5>
          <p class="card-text">Example chat room with rpc_ts (real-time, React+Redux).</p>
          <a href="https://github.com/aiden/rpc_ts_chat" class="btn btn-light" target="_blank">
            <img class="github" src="/assets/images/github.svg" />
            GitHub
          </a>
        </div>
      </div>
    </div>
    <div class="col-sm-4 d-flex align-items-stretch">
      <div class="card w-100">
        <div class="card-body">
          <h5 class="card-title">rpc_ts_aws_cognito</h5>
          <p class="card-text">Example authentication for rpc_ts with AWS Cognito.</p>
          <a href="#" class="btn btn-primary disabled" target="_blank">
            <img class="github" src="/assets/images/github_reverse.svg" />
            Coming soon
          </a>
        </div>
      </div>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-lg-12">
      <h3 id="why"><a name="why"></a>Why rpc_ts?</h3>
    </div>
  </div>

  <div class="row gutter why">
    <div class="col-lg-12">
      <p class="quote" style="margin-top: 0">rpc_ts was made for the startup engineer who prioritizes time to market, readability and correctness.</p>
      <p>rpc_ts was developed with agility first and foremost in mind. It does not explicitly address scalability or performance (although this should not be a problem, really), but helps writing Minimal Viable web apps, decreasing time to market, and improving the developer experience without compromising correctness.</p>
      <p>rpc_ts was made for the startup engineer who recognizes that using one language is always preferable to using many, that proven technologies should be favoured over new, shiny ones, and that messing with the toolchain to enable code generation with custom DSLs (Domain-Specific Languages) is a time pit.</p>
      <p class="emphasis">We believe that rpc_ts fills an important gap in the RPC ecosystem: it provides a hassle-free way to define APIs in an expressive language, TypeScript, so that we can build isomorphic applications faster. 🏖</p>
      <p>For more info about this positioning, including a comparison with other technologies, see our <a href="#" class="disabled" target="_blank">open-sourcing announcement</a>.</p>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-lg-12">
      <h3 id="articles"><a name="articles"></a>Articles</h3>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-sm-6 d-flex align-items-stretch">
      <div class="card w-100 text-white bg-primary">
        <div class="card-body">
          <h5 class="card-title">Open sourcing rpc_ts, an RPC framework for TypeScript.</h5>
          <p class="card-text">rpc_ts is a framework for type-safe Remote Procedure Calls (RPC) in TypeScript. In this post, I'm going to compare our design to other solutions out there and go through the rationale for coming up with rpc_ts.</p>
          <a href="#" class="btn btn-light disabled">
            Coming soon
          </a>
        </div>
      </div>
    </div>
    <div class="col-sm-6 d-flex align-items-stretch">
      <div class="card w-100">
        <div class="card-body">
          <h5 class="card-title">How to write an authentication middleware for rpc_ts: the case of AWS Cognito.</h5>
          <p class="card-text">This post shows how you can add authentication to an rpc_ts API using AWS Cognito.</p>
          <a href="#" class="btn btn-primary disabled">
            Coming soon
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
