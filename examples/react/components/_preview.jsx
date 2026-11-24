import PropTypes from 'prop-types';

const Preview = (props) => {
    return (
        // biome-ignore lint/a11y/useHtmlLang: example preview shell; the language belongs to the rendered component
        <html>
            <head>
                <meta name="componentName" value={props._adapter.componentName} />
                <meta name="defaultContextData" value={props.foo} />
            </head>
            <body>
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: props.yield is the already-rendered component markup */}
                <div id="root" dangerouslySetInnerHTML={{ __html: props.yield }} />
            </body>
        </html>
    );
};

Preview.propTypes = {
    foo: PropTypes.string,
    yield: PropTypes.string,
    _adapter: PropTypes.shape({
        componentName: PropTypes.string,
    }),
};

export default Preview;
