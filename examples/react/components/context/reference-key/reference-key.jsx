import React from "react";
import PropTypes from "prop-types";

const ReferenceKey = (props) => {
    return <p>{props.text}</p>;
};

ReferenceKey.propTypes = {
    text: PropTypes.string,
};

export default ReferenceKey;
