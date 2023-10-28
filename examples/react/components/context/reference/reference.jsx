import React from "react";
import PropTypes from "prop-types";

const Reference = (props) => {
    return <p>{props.parent.text}</p>;
};

Reference.propTypes = {
    parent: PropTypes.shape({
        text: PropTypes.string,
    }),
};

export default Reference;
