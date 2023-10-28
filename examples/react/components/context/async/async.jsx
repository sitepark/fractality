import React from "react";
import PropTypes from "prop-types";

const Async = (props) => {
    return (
        <a href={`https://xkcd.com/${props.xkcd.num}`} target="_blank" rel="nooopener noreferrer">
            <img src={props.xkcd.img} alt={props.xkcd.title} />
        </a>
    );
};

Async.propTypes = {
    xkcd: PropTypes.shape({
        num: PropTypes.number,
        img: PropTypes.string,
        title: PropTypes.string,
    }),
};

export default Async;
