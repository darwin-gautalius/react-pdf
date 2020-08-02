import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import makeCancellable from 'make-cancellable-promise';

import PageContext from '../PageContext';

import {
  cancelRunningTask,
  errorOnDev,
} from '../shared/utils';

import { isPage, isRotate } from '../shared/propTypes';

export class TextLayerInternal extends PureComponent {
  state = {
    textItems: null,
  }

  componentDidMount() {
    const { page } = this.props;

    if (!page) {
      throw new Error('Attempted to load page text content, but no page was specified.');
    }

    this.loadTextItems();
  }

  componentDidUpdate(prevProps) {
    const { page } = this.props;

    if (prevProps.page && (page !== prevProps.page)) {
      this.loadTextItems();
    }
  }

  componentWillUnmount() {
    cancelRunningTask(this.runningTask);
  }

  loadTextItems = async () => {
    const { page } = this.props;

    try {
      const cancellable = makeCancellable(page.getTextContent());
      this.runningTask = cancellable;
      const { items: textItems } = await cancellable.promise;
      this.setState({ textItems }, this.onLoadSuccess);
    } catch (error) {
      this.onLoadError(error);
    }
  }

  onLoadSuccess = () => {
    const { onGetTextSuccess } = this.props;
    const { textItems } = this.state;

    if (onGetTextSuccess) onGetTextSuccess(textItems);
  }

  onLoadError = (error) => {
    this.setState({ textItems: false });

    errorOnDev(error);

    const { onGetTextError } = this.props;

    if (onGetTextError) onGetTextError(error);
  }

  get unrotatedViewport() {
    const { page, scale } = this.props;

    return page.getViewport({ scale });
  }

  /**
   * It might happen that the page is rotated by default. In such cases, we shouldn't rotate
   * text content.
   */
  get rotate() {
    const { page, rotate } = this.props;
    return rotate - page.rotate;
  }

  renderTextItems() {
    const { textItems } = this.state;

    if (!textItems) {
      return null;
    }
    const { scale } = this.props;
    const [xMin, yMin, xMax, yMax] = this.unrotatedViewport.viewBox;
    const rotation = this.unrotatedViewport.rotation % 360;

    return textItems.map((textItem, keyItemIndex) => {
      const { left, top, height: renderedHeight } = ((
        [/* fontHeightPx */, /* fontWidthPx */, width, height, x, y],
      ) => {
        if (rotation >= 270) {
          return {
            top: xMax - x - width,
            left: yMax - y,
            height: width,
          };
        }
        if (rotation >= 180) {
          return {
            top: yMin + y,
            left: xMax - x,
            height,
          };
        }
        if (rotation >= 90) {
          return {
            top: xMin + x,
            left: yMin + y,
            height: width,
          };
        }
        return {
          top: yMax - y - height,
          left: x + xMin,
          height,
        };
      })(textItem.transform);

      return (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={keyItemIndex}
          ref={(ref) => { this.item = ref; }}
          style={{
            fontFamily: 'sans-serif',
            fontSize: `${renderedHeight * scale}px`,
            position: 'absolute',
            top: `${top * scale}px`,
            left: `${left * scale}px`,
            transformOrigin: 'left bottom',
            whiteSpace: 'pre',
            pointerEvents: 'all',
          }}
        >
          {textItem.str}
        </span>
      );
    });
  }

  render() {
    const { unrotatedViewport: viewport, rotate } = this;

    return (
      <div
        className="react-pdf__Page__textContent"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
          color: 'transparent',
          transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
          WebkitTransform: `translate(-50%, -50%) rotate(${rotate}deg)`,
          pointerEvents: 'none',
        }}
      >
        {this.renderTextItems()}
      </div>
    );
  }
}

TextLayerInternal.propTypes = {
  onGetTextError: PropTypes.func,
  onGetTextSuccess: PropTypes.func,
  page: isPage.isRequired,
  rotate: isRotate,
  scale: PropTypes.number,
};

export default function TextLayer(props) {
  return (
    <PageContext.Consumer>
      {context => <TextLayerInternal {...context} {...props} />}
    </PageContext.Consumer>
  );
}
