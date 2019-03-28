---
layout: home
---

<div id="hero-section" class="container-fluid">
  <div class="row gutter">
    <div class="text-center main-text">
      <h1 class="display-3">Remote Procedure Calls in Typescript made simple 🤞</h1>
      <p class="lead">rpc_ts provides a hassle-free way to define APIs in TypeScript, to build isomorphic applications faster.</p>
    </div>
  </div>
  <div class="row gutter button-container">
    {% include button.html color="blue" url="#get_started" text="Get Started" %}
    {% include button.html color="white" url="https://github.com/aiden/rpc_ts" text="GitHub" target="_blank" %}
  </div>

  <div class="row">
    <div class="container-fluid usp-container">
      <div class="row gutter ups-section">
        {% for item in site.data.usps %}
          <div class="col-md p-md-4 py-3 {{ item.position }}">
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
      <h3 style="margin: 0; margin-bottom: -20px"><a name="examples" id="examples"></a>Syntax</h3>
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
      <h3><a name="examples" id="examples"></a>Examples</h3>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-sm-4 d-flex align-items-stretch">
      <div class="card w-100">
        <div class="card-body">
          <h5 class="card-title">rpc_ts_primer</h5>
          <p class="card-text">A minimal, functional example for rpc_ts.</p>
          <a href="https://github.com/aiden/rpc_ts_primer" class="btn btn-primary">
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
          <a href="https://github.com/aiden/rpc_ts_chat" class="btn btn-light">
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
          <a href="https://github.com/aiden/rpc_ts_aws_cognito" class="btn btn-primary disabled">
            <img class="github" src="/assets/images/github_reverse.svg" />
            Coming soon
          </a>
        </div>
      </div>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-lg-12">
      <h3><a name="articles" id="articles"></a>Why rpc_ts?</h3>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-lg-12">
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>
      <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.</p>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-lg-12">
      <h3><a name="articles" id="articles"></a>Articles</h3>
    </div>
  </div>

  <div class="row gutter">
    <div class="col-sm-6 d-flex align-items-stretch">
      <div class="card w-100 text-white bg-primary">
        <img class="card-img-top" src="https://cdn-images-1.medium.com/max/2400/1*VEll6n1SaRHUyAiMHpg7tA.jpeg" alt="Card image cap" />
        <div class="card-body">
          <h5 class="card-title">Open sourcing rpc_ts, an RPC framework for TypeScript.</h5>
          <p class="card-text">rpc_ts is a framework for type-safe Remote Procedure Calls (RPC) in TypeScript. In this post, I'm going to compare our design to other solutions out there and go through the rationale for coming up with rpc_ts.</p>
          <a href="https://github.com/aiden/rpc_ts_primer" class="btn btn-light">
            Read more
          </a>
        </div>
      </div>
    </div>
    <div class="col-sm-6 d-flex align-items-stretch">
      <div class="card w-100">
        <img class="card-img-top" src="https://cdn-images-1.medium.com/max/1600/1*9MC5tr-4rnNA7rp6ngeZTA.jpeg" alt="Card image cap" />
        <div class="card-body">
          <h5 class="card-title">How to write an authentication middleware for rpc_ts: the case of AWS Cognito.</h5>
          <p class="card-text">This post shows how you can add authentication to an rpc_ts API using AWS Cognito.</p>
          <a href="https://github.com/aiden/rpc_ts_primer" class="btn btn-primary">
            Read more
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
