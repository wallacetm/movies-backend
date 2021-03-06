import { inject } from 'inversify';
import { BaseHttpController, controller, interfaces, requestParam, httpGet, queryParam, httpPost, requestBody, httpPut } from 'inversify-express-utils';
import { MovieService } from './interfaces';
import { TYPES } from '../../core/containers/types';
import { QueryBuilder } from 'typeorm-express-query-builder';
import * as createHttpError from 'http-errors';
import { permission } from '../../shared/decorators/permission.decorator';
import { MovieToSaveDTO } from './movie-to-save.dto';
import { validate } from '../../shared/decorators/validate.decorator';
import { VoteToSaveDTO } from './votes/vote-to-save.dto';

@controller('/movies')
export class MovieController extends BaseHttpController {

  @inject(TYPES.CONTAINER_DEFAULT_MOVIE_SERVICE) private readonly service: MovieService;

  /**
   * List movies.
   * To filter data use the pattern bellow:
   * GET /movies?name__contains=avenger&actors__in=robert&gender=action&page=3&limit=10
   * Source: https://www.npmjs.com/package/typeorm-express-query-builder#available-lookups
   * 
   * @route GET /movies
   * @group Movie
   * @param {string} director.query - director filter query
   * @param {string} name.query - name filter query
   * @param {string} gender.query - gender filter query
   * @param {string} actors.query - actors filter query
   * @returns {Array<Movie>} 200 - Movie list.
   */
  @httpGet('')
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public async list(@queryParam() query: any): Promise<interfaces.IHttpActionResult> {
    try {
      const options = new QueryBuilder(query).build();
      return this.ok(await this.service.getAll(options));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a movie.
   *
   * @route GET /movies/:uuid
   * @group Movie
   * @param {string} uuid.param - Movie uuid.
   * @returns {Movie.model} 200 - Movie list.
   * @returns {HttpError.model} 404 - Movie not found.
   */
  @httpGet('/:uuid')
  public async get(@requestParam('uuid') uuid: string): Promise<interfaces.IHttpActionResult> {
    try {
      return this.ok(await this.service.get(uuid));
    } catch (error) {
      throw createHttpError(404, `Movie not found with uuid: ${uuid}`);
    }
  }

  /**
   * Create a movie.
   *
   * @route POST /movies
   * @group Movie
   * @param {MovieToSave.model} movie.body - Movie payload.
   * @returns {Movie.model} 200 - Movie created.
   * @returns {HttpError.model} 409 - Movie already exists.
   * @returns {HttpError.model} 422 - Movie payload invalid.
   */
  @permission('admin')
  @validate(MovieToSaveDTO)
  @httpPost('', TYPES.CONTAINER_REQUIRED_AUTH_MIDDLEWARE)
  public async create(@requestBody() movie: MovieToSaveDTO): Promise<interfaces.IHttpActionResult> {
    try {
      const exists = await this.service.exists({ name: movie.name });
      if (exists) {
        throw createHttpError(409, `Movie already exists with name: ${movie.name}`);
      }
      return this.ok(await this.service.save(movie));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vote on a movie.
   *
   * @route PUT /movies/:uuid/votes
   * @group Movie
   * @param {string} uuid.param - Movie uuid.
   * @param {VoteToSave.model} vote.body - Vote payload.
   * @returns {string} 200 - OK.
   * @returns {HttpError.model} 422 - Movie payload invalid.
   */
  @permission('user')
  @validate(VoteToSaveDTO)
  @httpPut('/:uuid/votes', TYPES.CONTAINER_REQUIRED_AUTH_MIDDLEWARE)
  public async vote(@requestParam('uuid') uuid: string, @requestBody() vote: VoteToSaveDTO): Promise<interfaces.IHttpActionResult> {
    try {
      await this.service.saveVote(uuid, vote);
      return this.ok();
    } catch (error) {
      throw error;
    }
  }




}