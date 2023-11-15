import React from 'react';
import PropTypes from 'prop-types';

export const PathContext = React.createContext({
    get: (path) => path,
});

export const PathProvider = (props) => {
    const { children, ...rest } = props;

    return React.createElement(PathContext.Provider, { value: rest }, children);
};

PathProvider.propTypes = {
    children: PropTypes.node,
    get: PropTypes.func,
};

export const usePath = () => {
    return React.useContext(PathContext);
};

export default PathProvider;
