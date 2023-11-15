import React from 'react';
import PropTypes from 'prop-types';

const Render = (props) => {
    return <>Render {props.something}</>;
};

Render.propTypes = {
    something: PropTypes.string,
};

export default Render;
