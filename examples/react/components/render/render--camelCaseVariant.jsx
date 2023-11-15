import React from 'react';
import PropTypes from 'prop-types';

const RenderCamelCaseVariant = (props) => {
    return <>Render camelCaseVariant {props.something}</>;
};

RenderCamelCaseVariant.propTypes = {
    something: PropTypes.string,
};

export default RenderCamelCaseVariant;
