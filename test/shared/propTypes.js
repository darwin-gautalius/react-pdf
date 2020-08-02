import PropTypes from 'prop-types';

/* eslint-disable import/prefer-default-export */

const fileTypes = [
  PropTypes.string,
  PropTypes.instanceOf(ArrayBuffer),
  PropTypes.shape({
    url: PropTypes.string,
    withCredentials: PropTypes.bool,
  }),
];
if (typeof File !== 'undefined') {
  fileTypes.push(PropTypes.instanceOf(File));
}
if (typeof Blob !== 'undefined') {
  fileTypes.push(PropTypes.instanceOf(Blob));
}

export const isFile = PropTypes.oneOfType(fileTypes);
