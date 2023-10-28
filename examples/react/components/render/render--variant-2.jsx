import React from "react";
import PropTypes from "prop-types";

const RenderVariant2 = (props) => {
    return <>Render variant-2 {props.something}</>;
};

RenderVariant2.propTypes = {
    something: PropTypes.string,
};

export default RenderVariant2;
