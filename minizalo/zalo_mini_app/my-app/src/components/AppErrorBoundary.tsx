import React from 'react';

export class AppErrorBoundary extends React.Component<{children:React.ReactNode}, {failed:boolean;revision:number}> {
  state = {failed:false,revision:0};
  static getDerivedStateFromError() { return {failed:true}; }
  render() {
    if (this.state.failed) return <main role="alert" className="min-h-screen bg-white p-6 text-stone-800">
      <h1 className="text-lg font-semibold">Không thể mở màn hình</h1>
      <button type="button" className="mt-4 rounded-lg border px-4 py-3" onClick={() => this.setState(current => ({failed:false,revision:current.revision+1}))}>Thử lại</button>
      <button type="button" className="ml-3 rounded-lg border px-4 py-3" onClick={() => window.location.reload()}>Tải lại ứng dụng</button>
    </main>;
    return <React.Fragment key={this.state.revision}>{this.props.children}</React.Fragment>;
  }
}
