/* eslint-disable react/jsx-no-target-blank */
import React from "react";
import tw from "twin.macro";
import { css } from "styled-components/macro"; //eslint-disable-line
const Container = tw.div`relative bg-gray-200 text-gray-700 -mb-8 -mx-8 px-8 py-20 lg:py-24`;
const Content = tw.div`max-w-screen-xl mx-auto relative z-10`;
const ThreeColRow = tw.div`flex flex-col md:flex-row items-center justify-between`;
const CopywrightNotice = tw.p`text-center text-sm sm:text-base mt-8 md:mt-0 font-medium text-gray-500`;

export default () => {
  return (
    <Container>
      <Content>
        <ThreeColRow>
          <CopywrightNotice>            
          </CopywrightNotice>
          <CopywrightNotice>
          </CopywrightNotice>
          <CopywrightNotice>by @lomaky</CopywrightNotice>
        </ThreeColRow>
      </Content>
    </Container>
  );
};
