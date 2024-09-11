import React, { Component } from "react";
import PropTypes from "prop-types";
import ChatBot, { Loading } from "react-simple-chatbot";
import { ThemeProvider } from "styled-components";
import tw from "twin.macro";

const AIResponse = tw.div`text-xs`;

class LomakyVectorDB extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      result: "",
      trigger: false,
    };

    this.triggerNext = this.triggerNext.bind(this);
  }

  componentDidMount() {
    const self = this;
    const { steps } = this.props;
    const search = steps.search.value;

    const queryUrl = `https://vectordb.lomaky.store/search?query=${search}`;

    const xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", function() {
      if (this.readyState === 4) {
        const data = JSON.parse(this.responseText);
        const response = data.Response;
        if (response && response) {
          self.setState({ loading: false, result: response }, () => {
            // Trigger next step after displaying response
            self.triggerNext();
          });
        } else {
          self.setState(
            {
              loading: false,
              result:
                "No encontramos respuesta a tu pregunta, intenta de nuevo.",
            },
            () => {
              // Trigger next step after displaying response
              self.triggerNext();
            }
          );
        }
      }
    });

    xhr.open("GET", queryUrl);
    xhr.send();
  }

  triggerNext() {
    this.setState({ trigger: true }, () => {
      this.props.triggerNextStep();
    });
  }

  render() {
    const { loading, result } = this.state;
    return <AIResponse>{loading ? <Loading /> : result}</AIResponse>;
  }
}

LomakyVectorDB.propTypes = {
  steps: PropTypes.object,
  triggerNextStep: PropTypes.func,
};

LomakyVectorDB.defaultProps = {
  steps: undefined,
  triggerNextStep: undefined,
};

const CHATBOT_THEME = {
  background: "#FFFEFC",
  headerBgColor: "#6415ff",
  headerFontColor: "#fff",
  headerFontSize: "15px",
  botBubbleColor: "#6415ff",
  botFontColor: "#fff",
  userBubbleColor: "#fff",
  userFontColor: "#4a4a4a",
};

const ChatBotHelper = () => {
  const steps = [
    {
      id: "1",
      message:
        "Hola, te puedo ayudar a resolver preguntas de noticias anteriores, ¿Qué quisieras saber?",
      trigger: "search",
    },
    {
      id: "search",
      user: true,
      trigger: "3",
    },
    {
      id: "3",
      component: <LomakyVectorDB />,
      waitAction: true,
      trigger: "4",
    },
    {
      id: "4",
      message: "¿Hay algo más que te gustaría saber?",
      trigger: "search",
    },
  ];

  return (
    <>
      <ThemeProvider theme={CHATBOT_THEME}>
        <ChatBot
          steps={steps}
          floating={true}
          headerTitle="Habla con las noticias"
          enableSmoothScroll={true}
        />
      </ThemeProvider>
    </>
  );
};

export default ChatBotHelper;
