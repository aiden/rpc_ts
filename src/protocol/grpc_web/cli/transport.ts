import * as childProcess from 'child_process';
import * as terminate from 'terminate';
import * as util from 'util';
import { grpc } from 'grpc-web-client';

export class CliTransport implements grpc.Transport {
  private process: childProcess.ChildProcess;

  constructor(
    private readonly command: string,
    private readonly options: grpc.TransportOptions,
  ) {}

  sendMessage(msgBytes: Uint8Array): void {
    this.process.stdin.write(msgBytes);
  }

  finishSend(): void {
    this.process.stdin.end();
  }

  cancel(): void {
    const killWithChildren = util.promisify(terminate);
    killWithChildren(this.process.pid);
  }

  start(metadata: grpc.Metadata): void {
    this.process = childProcess.spawn(this.command, [
      this.options.url,
      JSON.stringify(metadata),
    ]);

    this.process.on('exit', (code, signal) => {
      if (code !== 0) {
        this.options.onEnd(
          new Error(
            `child process exited with code ${code} and signal ${signal}`,
          ),
        );
      }
    });

    this.process.on('error', (err: Error) => {
      this.options.onEnd(err);
    });

    this.process.stdout.on('data', (data: Buffer) => {
      this.options.onChunk(data);
    });
  }
}
