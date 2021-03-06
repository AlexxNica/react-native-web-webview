import Qs from 'qs';
import React, { Component } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

export default class extends Component {
  state = { html: null };

  constructor(props) {
    super(props);
    this.handleSource(props.source, props.newWindow);
  }

  handleSource = (source, newWindow) => {
    if (!source.method) return;

    if (newWindow) {
      this.handleSourceInNewWindow(source, newWindow);
    } else {
      this.handleSourceInIFrame(source);
    }
  };

  handleSourceInIFrame = source => {
    const { uri, ...options } = source;
    const baseUrl = uri.substr(0, uri.lastIndexOf('/') + 1);
    fetch(uri, options)
      .then(response => response.text())
      .then(html => this.setState({ html: `<base href="${baseUrl}" />` + html }));
  };

  handleSourceInNewWindow = (source, newWindow) => {
    if (source.method === 'POST') {
      const contentType = source.headers['Content-Type'];
      let body = '';
      if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        body = Qs.parse(source.body);
      } else {
        console.warn(
          '[WebView] When opening a new window, this content-type is not supported yet, please make a PR!',
          contentType
        );
        return;
      }

      window.open(
        require('./postMock.html') +
          '?' +
          Qs.stringify({
            uri: source.uri,
            body: JSON.stringify(body),
          }),
        newWindow.name || 'webview',
        newWindow.features || undefined
      );
    } else {
      console.warn(
        '[WebView] When opening a new window, this method is not supported yet, please make a PR!',
        source.method
      );
    }
  };

  componentDidMount() {
    if (this.props.onMessage) {
      window.addEventListener('message', this.onMessage, true);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      this.props.source.uri !== nextProps.source.uri ||
      this.props.source.method !== nextProps.source.method ||
      this.props.source.body !== nextProps.source.body
    ) {
      this.handleSource(nextProps.source, nextProps.newWindow);
    }
  }

  componentWillUnmount() {
    if (this.props.onMessage) {
      window.removeEventListener('message', this.onMessage, true);
    }
  }

  onMessage = nativeEvent => nativeEvent.isTrusted && this.props.onMessage({ nativeEvent });

  render() {
    if (this.props.newWindow) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      );
    }

    const { source } = this.props;
    return (
      <iframe
        src={!source.method ? source.uri : undefined}
        srcDoc={this.state.html || source.html}
        style={{ width: '100%', height: '100%', border: 0 }}
        allowFullScreen
        allowpaymentrequest="true"
        frameBorder="0"
        seamless
      />
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
