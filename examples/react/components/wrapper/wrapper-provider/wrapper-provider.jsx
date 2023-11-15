import React from 'react';
import PropTypes from 'prop-types';

const WrapperContext = React.createContext({
    getValue: (value) => value,
});

const WrapperProvider = (props) => {
    const { children, ...rest } = props;
    return <WrapperContext.Provider value={rest}>{children}</WrapperContext.Provider>;
};

WrapperProvider.propTypes = {
    children: PropTypes.node,
    getValue: PropTypes.func,
};

export default WrapperProvider;
module.exports.WrapperContext = WrapperContext;
