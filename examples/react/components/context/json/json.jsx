import React from "react";
import PropTypes from "prop-types";

const Json = (props) => {
    return <p>{props.text}</p>;
};

Json.propTypes = {
    text: PropTypes.string,
};

export default Json;
