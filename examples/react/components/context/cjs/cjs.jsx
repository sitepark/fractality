import React from 'react';
import PropTypes from 'prop-types';

const Js = (props) => {
    return <p>{props.text}</p>;
};

Js.propTypes = {
    text: PropTypes.string,
};

export default Js;
