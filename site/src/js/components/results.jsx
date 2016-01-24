import React from "react";
var URI = require("urijs");
var Humanize = require("humanize-plus");

const NANO=1000000000;

export default class Results extends React.Component {
  requestResults() {
    var options = {
      url: this.props.url,
      c: 5,
      tot: 1000,
      timeout: 5
    }
    this.setState(options);

    var wsURI = URI("wss://api.goad.io/goad").query(options);

    var socket = new WebSocket(wsURI.toString());

    socket.onopen = event => {
      this.setState({
        socketOpen: true,
        error: null
      });
      this.socket = socket;
    };

    socket.onclose = event => {
      this.setState({
        socketOpen: false,
        error: null
      });
    }

    socket.onerror = event => {
      this.setState({
        socketOpen: socket.readyState == WebSocket.OPEN,
        error: true,
        errorData: event.data
      });
    }

    socket.onmessage = this.handleMessage.bind(this)
  }

  handleMessage(event) {
    const data = JSON.parse(event.data);
    this.setState({
      data: data
    });
  }

  componentWillMount() {
    this.requestResults();
  }

  sendToSocket(data) {
    if (this.state && this.state.socketOpen) {
      this.socket.send(JSON.stringify(data));
    }
  }

  resultsHandler() {
    if (this.state) {
      if (this.state.socketOpen || this.state.data) {
        if (this.state.data) {
          return this.resultsFormatter();
        } else {
          return "Waiting for results..."
        }
      } else {
        if (this.state.error == null) {
          return "Waiting for socket...";
        } else {
          return "Socket error ";
        }
      }
    } else {
      return "Loading..."
    }
  }

  resultsFormatter() {
    if (this.state.data) {
      const data = this.state.data;
      var regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-northeast-1"].map(name => {
        if (data.Regions[name]) {
          return this.formatRegionData(name, data.Regions[name]);
        }
      })

      return regions.join("\n").trim();
    } else {
      return "No results";
    }
  }

  formatRegionData(region, data) {
    return `Region: ${region}

        Total Requests           ${data["total-reqs"]}
        Total Transferred        ${Humanize.fileSize(data["tot-bytes-read"])}
        Average Time/Req         ${(data["ave-time-for-req"]/NANO).toFixed(2)} seconds
        Average Req/s            ${data["ave-req-per-sec"].toFixed(2)}
        Average Time To 1st Byte ${(data["ave-time-to-first"]/NANO).toFixed(2)} seconds
    `
  }

  render() {
    var cursor = <span />;
    var socketClass = "float-right glyphicon glyphicon-remove-sign";

    if (this.state) {
      if (this.state.socketOpen) {
        socketClass = "float-right text-success glyphicon glyphicon-flash";
        cursor = <span className="blinking-cursor">▊</span>;
      } else {
        if (this.state.data) {
          socketClass = "float-right text-muted glyphicon glyphicon-flash";
        } else {
          socketClass = "float-right text-danger glyphicon glyphicon-remove-sign";
        }
      }
    }

    var socket = <span className={socketClass} aria-hidden="true"></span>;

    return (
      <div className="panel panel-results test-results">
        <div className="panel-heading">
          <h3 className="panel-title">$ goad -n {this.state.tot} -c {this.state.c} -m GET {this.props.url} {socket}</h3>
        </div>
        <div className="panel-body">
          <pre>{this.resultsHandler()}{cursor}</pre>
        </div>
      </div>
    );
  }
}
