import React, { useState, useEffect } from "react";
import AnimationRevealPage from "helpers/AnimationRevealPage.js";
import { Container, ContentWithPaddingSm } from "components/misc/Layouts";
import tw from "twin.macro";
import styled from "styled-components";
import { css } from "styled-components/macro";
import Footer from "components/footers/FiveColumnWithInputForm.js";
import { PrimaryButton } from "components/misc/Buttons";
import SentimentGauge from "components/features/SentimentGauge";
import NoPhotoPlaceholder from "images/placeholder.png";

const Posts = tw.div`mt-6 sm:-mr-8 flex flex-wrap`;
const PostContainer = styled.div`
  ${tw`mt-5 w-full sm:w-1/2 lg:w-1/3 sm:pr-8`}
  ${props =>
    props.featured &&
    css`
      ${tw`w-full!`}
      ${Post} {
        ${tw`sm:flex-row! h-full sm:pr-4`}
      }
      ${Image} {
        ${tw`sm:h-96 sm:min-h-full sm:w-1/2 lg:w-2/3 sm:rounded-t-none sm:rounded-l-lg`}
      }
      ${Info} {
        ${tw`sm:-mr-4 sm:pl-8 sm:flex-1 sm:rounded-none sm:rounded-r-lg sm:border-t-2 sm:border-l-0`}
      }
      ${Description} {
        ${tw`text-sm mt-3 leading-normal text-gray-600 font-medium text-justify`}
      }
    `}
`;
const Post = tw.div`cursor-pointer flex flex-col bg-gray-100 rounded-lg`;
const Image = styled.div`
  ${props => css`background-image: url("${props.imageSrc}");`}
  ${tw`h-64 w-full bg-cover bg-center rounded-t-lg`}
`;
const Info = tw.div`p-8 border-2 border-t-0 rounded-lg rounded-t-none`;
const Category = tw.div`uppercase text-primary-500 text-xs font-bold tracking-widest leading-loose after:content after:block after:border-b-2 after:border-primary-500 after:w-8`;
const CreationDate = tw.div`mt-2 uppercase text-gray-600 italic font-semibold text-xs`;
const Title = tw.div`mt-1 font-black text-lg text-gray-900 group-hover:text-primary-500 transition duration-300`;
const AISummaryTitle = tw.span`bg-primary-500 text-gray-100 px-4 transform -skew-x-12 inline-block mt-1`;
const Description = tw.div`text-sm mt-3 leading-normal text-gray-600 font-medium text-justify`;
const PositiveBadge = styled.div`
  ${css`padding-top: 0.1em; padding-bottom: 0.1rem;`}
  ${tw`mt-3 font-bold text-xs px-3 bg-green-200 text-green-800 rounded-full text-center w-32`}
`;
const NegativeBadge = styled.div`
  ${css`padding-top: 0.1em; padding-bottom: 0.1rem;`}
  ${tw`mt-3 font-bold text-xs px-3 bg-red-200 text-red-800 rounded-full text-center w-32`}
`;
const NeutralBadge = styled.div`
  ${css`padding-top: 0.1em; padding-bottom: 0.1rem;`}
  ${tw`mt-3 font-bold text-xs px-3 bg-yellow-200 text-yellow-800 rounded-full text-center w-32`}
`;


const ButtonContainer = tw.div`flex justify-center`;
const LoadMoreButton = tw(PrimaryButton)`mt-16 mx-auto`;


const Subheading = tw.span`uppercase tracking-widest font-bold text-primary-500`;
const LastNewsUpdate = tw.div`uppercase text-xs`;
const HighlightedText = tw.span`text-primary-500`;
const url = 'https://news-analyser.s3.us-west-2.amazonaws.com/latest.json?at=' + new Date().toISOString();
const posts = [];

export default () => {
  const [visible, setVisible] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  useEffect(() => {    
    setAnalysis(null);
    fetch(url).then ( response => {
        response.json().then(jsonAnalysis => {
          let featured = 0;
          for (const article of jsonAnalysis.articles) {
            posts.push({
              imageSrc: article.thumbnail ? article.thumbnail : NoPhotoPlaceholder,
              category: article.category,
              date: new Date(article.date).toDateString(),
              title: article.title,
              description: article.summary,
              url: article.url,
              featured: featured++<3,
              sentiment: article.sentiment,
              positive: article.positive === true,
              negative: article.positive === false,
              neutral: article.positive === undefined || article.positive === null
            });
          }
          setAnalysis(jsonAnalysis);          
        });
        setVisible(9);
      }        
    );
  }, []);  
  const onLoadMoreClick = () => {
    setVisible(v => v + 6);
  };
  return (
    <AnimationRevealPage>
      <Container>
        {analysis && (
          <ContentWithPaddingSm> 
            <SentimentGauge
              positiveIndex={analysis.positiveIndex/100}
              subheading={<Subheading>INDICE POSITIVISMO</Subheading>}
              heading={
                <>
                  Hoy las noticias de Colombia están <br/> <HighlightedText>{analysis.positiveIndex}%</HighlightedText> positivas
                </>
              }
              description={
                        <>
                          Constantemente calculamos el índice de positivismo de Colombia haciendo un análisis de sentimiento de las noticias con &nbsp;
                          <AISummaryTitle>Inteligencia Artificial.</AISummaryTitle>
                        </>
              }
            />
            <Subheading>
              RESUMEN DE NOTICIAS
            </Subheading>
            <LastNewsUpdate>{new Date(analysis.updated).toDateString()}</LastNewsUpdate>
            <Posts>
              {posts.slice(0, visible).map((post, index) => (
                <PostContainer key={index} featured={post.featured}>
                  <Post className="group" as="a" href={post.url} target="_blank">
                    <Image imageSrc={post.imageSrc} />
                    <Info>
                      <Category>{post.category}</Category>
                      {post.positive && (<PositiveBadge>{post.sentiment}</PositiveBadge> )}
                      {post.negative && (<NegativeBadge>{post.sentiment}</NegativeBadge> )}
                      {post.neutral && (<NeutralBadge>{post.sentiment??'Neutral'}</NeutralBadge> )}
                      <CreationDate>{post.date}</CreationDate>
                      <Title>{post.title}</Title>
                      <AISummaryTitle>Resumen IA</AISummaryTitle>
                      {post.description && <Description>{post.description}</Description>}
                    </Info>
                  </Post>
                </PostContainer>
              ))}
            </Posts>
            {visible < posts.length && (
              <ButtonContainer>
                <LoadMoreButton onClick={onLoadMoreClick}>Ver mas noticias</LoadMoreButton>
              </ButtonContainer>
            )}
          </ContentWithPaddingSm>
        )}
      </Container>
      {analysis && (
        <Footer />
      )}
    </AnimationRevealPage>
  );
};
