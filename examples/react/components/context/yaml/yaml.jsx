import React from "react";
import PropTypes from "prop-types";

const Yaml = (props) => {
    return <p>{props.text}</p>;
};

Yaml.propTypes = {
    text: PropTypes.string,
};

export default Yaml;
